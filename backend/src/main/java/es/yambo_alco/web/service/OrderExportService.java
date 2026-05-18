package es.yambo_alco.web.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import es.yambo_alco.web.model.*;
import es.yambo_alco.web.model.enums.OrderStatus;
import es.yambo_alco.web.repository.FamilyProductRepository;
import es.yambo_alco.web.repository.OrderRepository;
import es.yambo_alco.web.repository.ProductRepository;
import es.yambo_alco.web.repository.UserRepository;
import es.yambo_alco.web.repository.spec.OrderSpecifications;
import es.yambo_alco.web.service.export.ExcelStyleFactory;
import es.yambo_alco.web.service.export.ExportReportType;
import es.yambo_alco.web.service.export.builder.FactoryReportBuilder;
import es.yambo_alco.web.service.export.builder.FullReportBuilder;
import es.yambo_alco.web.service.export.builder.ReportBuilder;
import es.yambo_alco.web.service.export.builder.WarehouseReportBuilder;
import es.yambo_alco.web.service.export.model.ProductGroup;
import es.yambo_alco.web.service.export.model.ProductGroupItem;
import es.yambo_alco.web.service.export.model.StylePack;
import lombok.RequiredArgsConstructor;
import org.apache.poi.util.IOUtils;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Orchestrates Excel export generation.
 *
 * <p>Loads order data from the database, groups it by product, applies any
 * requested filters, then delegates to the appropriate {@link ReportBuilder}
 * based on the requested {@link ExportReportType}.</p>
 *
 * <p>Supported report types:</p>
 * <ul>
 *   <li>{@code FULL} — full order detail, per-row, all fields (default, backward-compatible)</li>
 *   <li>{@code FACTORY} — aggregated, anonymous; default filter: {@code PENDING_FABRICATION}</li>
 *   <li>{@code WAREHOUSE} — aggregated + blank validation columns; default filter: {@code TO_BE_DELIVERED}</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class OrderExportService {

    private static final Logger log = LoggerFactory.getLogger(OrderExportService.class);

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final FamilyProductRepository familyProductRepository;
    private final FullReportBuilder fullReportBuilder;
    private final FactoryReportBuilder factoryReportBuilder;
    private final WarehouseReportBuilder warehouseReportBuilder;

    private static final ObjectMapper objectMapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    private static final List<OrderStatus> INCLUDED_STATUSES = List.of(
            OrderStatus.CONFIRMING_PAYMENT,
            OrderStatus.PAYMENT_CONFIRMED,
            OrderStatus.PENDING_PRODUCTS,
            OrderStatus.CLOSED
    );

    // ════════════════════════════════════════════════════════
    // Public API
    // ════════════════════════════════════════════════════════

    /** Backward-compatible overload: produces a FULL report with no product-status filter. */
    public byte[] exportOrders(List<String> dropIds) throws IOException {
        return exportOrders(dropIds, ExportReportType.FULL, null);
    }

    /**
     * Generates an Excel workbook for the requested report type.
     *
     * @param dropIds             optional drop IDs to restrict products; {@code null} means all drops
     * @param reportType          the report format to generate (defaults to {@code FULL} when {@code null})
     * @param productStatusFilter overrides the default status filter for the report type;
     *                            {@code null} uses the type's default
     */
    public byte[] exportOrders(List<String> dropIds,
                                ExportReportType reportType,
                                OrderStatus productStatusFilter) throws IOException {
        if (reportType == null) reportType = ExportReportType.FULL;
        OrderStatus effectiveFilter = resolveStatusFilter(reportType, productStatusFilter);

        // 1. Load orders (order-level status: always the same included set)
        Specification<Order> spec = Specification.where(OrderSpecifications.statusIn(INCLUDED_STATUSES));
        List<Order> orders = orderRepository.findAll(spec, Pageable.unpaged()).getContent();

        // 2. Load all products and drops for resolution
        Map<String, Product> productMap = productRepository.findAll().stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
        Map<String, FamilyProduct> dropMap = familyProductRepository.findAll().stream()
                .collect(Collectors.toMap(FamilyProduct::getId, d -> d));
        Map<String, User> userCache = new HashMap<>();

        // 3. Determine which product IDs belong to selected drops
        Set<String> allowedProductIds = null;
        if (dropIds != null && !dropIds.isEmpty()) {
            allowedProductIds = productMap.values().stream()
                    .filter(p -> p.getFamilyProduct() != null
                            && dropIds.contains(p.getFamilyProduct().getId()))
                    .map(Product::getId)
                    .collect(Collectors.toSet());
        }

        // 4. Group order-products by productId, applying both drop and status filters
        Map<String, ProductGroup> groups = new LinkedHashMap<>();

        for (Order order : orders) {
            User user = userCache.computeIfAbsent(order.getCustomerId(),
                    id -> userRepository.findById(id).orElse(null));

            if (order.getOrderProducts() == null) continue;

            for (OrderProduct op : order.getOrderProducts()) {
                if (allowedProductIds != null && !allowedProductIds.contains(op.getProductId())) {
                    continue;
                }
                if (effectiveFilter != null && !effectiveFilter.equals(order.getStatus())) {
                    continue;
                }

                Product product = productMap.get(op.getProductId());
                FamilyProduct drop = product != null && product.getFamilyProduct() != null
                        ? dropMap.get(product.getFamilyProduct().getId())
                        : null;

                String productName = product != null ? product.getName() : op.getProductId();
                String dropName    = drop != null ? drop.getName() : "Sin Drop";
                String dropId      = drop != null ? drop.getId()   : "";

                Map<String, Object> configParsed = parseConfig(op.getConfiguration());

                groups.computeIfAbsent(op.getProductId(), k ->
                        new ProductGroup(op.getProductId(), productName, dropName, dropId, product));

                groups.get(op.getProductId()).items.add(new ProductGroupItem(
                        order.getId(),
                        user != null ? user.getName()  : "N/A",
                        user != null ? user.getEmail() : "",
                        order.getStatus(),
                        order.getCreatedAt(),
                        op.getQuantity(),
                        op.getPrice(),
                        configParsed
                ));
            }
        }

        // 5. Resolve selected drop names for the report title/subtitle
        List<String> selectedDropNames = new ArrayList<>();
        if (dropIds != null && !dropIds.isEmpty()) {
            for (String id : dropIds) {
                FamilyProduct fp = dropMap.get(id);
                if (fp != null) selectedDropNames.add(fp.getName());
            }
        }

        // 6. Build workbook and delegate to the appropriate builder
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            byte[] logoBytes = loadLogo();
            StylePack styles = ExcelStyleFactory.createStyles(wb);
            selectBuilder(reportType).build(wb, groups, selectedDropNames, logoBytes, styles);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return out.toByteArray();
        }
    }

    // ════════════════════════════════════════════════════════
    // Private helpers
    // ════════════════════════════════════════════════════════

    private OrderStatus resolveStatusFilter(ExportReportType reportType,
                                                   OrderStatus override) {
        if (override != null) return override;
        return switch (reportType) {
            case FACTORY   -> OrderStatus.PAYMENT_CONFIRMED;
            case WAREHOUSE -> OrderStatus.PENDING_PRODUCTS;
            case FULL      -> null;
        };
    }

    private ReportBuilder selectBuilder(ExportReportType reportType) {
        return switch (reportType) {
            case FACTORY   -> factoryReportBuilder;
            case WAREHOUSE -> warehouseReportBuilder;
            case FULL      -> fullReportBuilder;
        };
    }

    private Map<String, Object> parseConfig(String configuration) {
        if (configuration == null || configuration.isBlank() || "{}".equals(configuration.trim())) {
            return Collections.emptyMap();
        }
        try {
            return objectMapper.readValue(configuration, new TypeReference<>() {});
        } catch (Exception e) {
            return Collections.emptyMap();
        }
    }

    private byte[] loadLogo() {
        try {
            ClassPathResource resource = new ClassPathResource("icons/logo.png");
            try (InputStream is = resource.getInputStream()) {
                return IOUtils.toByteArray(is);
            }
        } catch (Exception e) {
            log.warn("Could not load logo for Excel export: {}", e.getMessage());
            return null;
        }
    }
}
