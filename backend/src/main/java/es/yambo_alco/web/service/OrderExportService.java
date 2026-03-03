package es.yambo_alco.web.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import es.yambo_alco.web.model.*;
import es.yambo_alco.web.model.enums.OrderProductStatus;
import es.yambo_alco.web.model.enums.OrderStatus;
import es.yambo_alco.web.repository.FamilyProductRepository;
import es.yambo_alco.web.repository.OrderRepository;
import es.yambo_alco.web.repository.ProductRepository;
import es.yambo_alco.web.repository.UserRepository;
import es.yambo_alco.web.repository.spec.OrderSpecifications;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.util.IOUtils;
import org.apache.poi.xssf.usermodel.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderExportService {

    private static final Logger log = LoggerFactory.getLogger(OrderExportService.class);

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final FamilyProductRepository familyProductRepository;

    private static final ObjectMapper objectMapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    // ── Brand colors ──
    private static final byte[] BRAND_PRIMARY = new byte[]{(byte) 0x8B, (byte) 0x5C, (byte) 0xF6};
    private static final byte[] BRAND_PRIMARY_DARK = new byte[]{(byte) 0x7C, (byte) 0x3A, (byte) 0xED};
    private static final byte[] BRAND_LIGHT = new byte[]{(byte) 0xF5, (byte) 0xF3, (byte) 0xFF};
    private static final byte[] TOTALS_BG = new byte[]{(byte) 0xFE, (byte) 0xF3, (byte) 0xC7};
    private static final byte[] TOTALS_FONT_COLOR = new byte[]{(byte) 0x92, (byte) 0x40, (byte) 0x0E};
    private static final byte[] BORDER_COLOR = new byte[]{(byte) 0xD1, (byte) 0xD5, (byte) 0xDB};
    private static final byte[] GRAY_600 = new byte[]{(byte) 0x6B, (byte) 0x72, (byte) 0x80};
    private static final byte[] GRAY_400 = new byte[]{(byte) 0x9C, (byte) 0xA3, (byte) 0xAF};
    private static final byte[] DARK_TEXT = new byte[]{(byte) 0x37, (byte) 0x41, (byte) 0x51};

    // ── Product status labels ──
    private static final Map<OrderProductStatus, String> PRODUCT_STATUS_LABELS = Map.of(
            OrderProductStatus.OPEN, "Abierto",
            OrderProductStatus.ORDER_CLOSED, "Pedido Cerrado",
            OrderProductStatus.PENDING_FABRICATION, "En Fabricación",
            OrderProductStatus.TO_BE_DELIVERED, "Por Entregar",
            OrderProductStatus.DELIVERED, "Entregado",
            OrderProductStatus.CANCELED, "Cancelado"
    );

    // ── Excluded order statuses ──
    private static final List<OrderStatus> INCLUDED_STATUSES = List.of(
            OrderStatus.CONFIRMING_PAYMENT,
            OrderStatus.PAYMENT_CONFIRMED,
            OrderStatus.PENDING_PRODUCTS,
            OrderStatus.CLOSED
    );

    /**
     * Generate an Excel workbook for manufacturer fabrication with:
     *   Sheet 1: "Resumen" — summary with logo, per-product totals
     *   Sheets 2+: one per product — expanded config columns, branded styling
     *
     * Auto-excludes PENDING_PAYMENT and CANCELED orders.
     * Optionally filters by drop IDs.
     */
    public byte[] exportOrders(List<String> dropIds) throws IOException {
        // 1. Load orders (only included statuses)
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

        // 4. Group order products by productId
        Map<String, ProductGroup> groups = new LinkedHashMap<>();

        for (Order order : orders) {
            User user = userCache.computeIfAbsent(order.getCustomerId(),
                    id -> userRepository.findById(id).orElse(null));

            if (order.getOrderProducts() == null) continue;

            for (OrderProduct op : order.getOrderProducts()) {
                if (allowedProductIds != null && !allowedProductIds.contains(op.getProductId())) {
                    continue;
                }

                Product product = productMap.get(op.getProductId());
                FamilyProduct drop = product != null && product.getFamilyProduct() != null
                        ? dropMap.get(product.getFamilyProduct().getId())
                        : null;

                String productName = product != null ? product.getName() : op.getProductId();
                String dropName = drop != null ? drop.getName() : "Sin Drop";
                String dropId = drop != null ? drop.getId() : "";

                Map<String, Object> configParsed = parseConfig(op.getConfiguration());

                groups.computeIfAbsent(op.getProductId(), k -> new ProductGroup(
                        op.getProductId(), productName, dropName, dropId, product
                ));

                groups.get(op.getProductId()).items.add(new ProductGroupItem(
                        order.getId(),
                        user != null ? user.getName() : "N/A",
                        user != null ? user.getEmail() : "",
                        order.getStatus(),
                        order.getCreatedAt(),
                        op.getQuantity(),
                        op.getPrice(),
                        configParsed,
                        op.getStatus()
                ));
            }
        }

        // 5. Selected drop names for title
        List<String> selectedDropNames = new ArrayList<>();
        if (dropIds != null && !dropIds.isEmpty()) {
            for (String id : dropIds) {
                FamilyProduct fp = dropMap.get(id);
                if (fp != null) selectedDropNames.add(fp.getName());
            }
        }

        // 6. Build workbook
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            // Load logo
            byte[] logoBytes = loadLogo();

            // Create styles
            StylePack styles = createStyles(wb);

            // Sheet 1: Summary
            createSummarySheet(wb, groups, selectedDropNames, logoBytes, styles);

            // Sheets 2+: per product (sorted by total qty desc)
            Set<String> usedNames = new HashSet<>();
            usedNames.add("Resumen");

            List<ProductGroup> sortedGroups = groups.values().stream()
                    .sorted(Comparator.comparingInt(ProductGroup::totalQty).reversed())
                    .toList();

            for (ProductGroup group : sortedGroups) {
                String sheetName = getUniqueSheetName(group.productName, usedNames);
                usedNames.add(sheetName);
                createProductSheet(wb, group, sheetName, styles);
            }

            // Write to byte array
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return out.toByteArray();
        }
    }

    // ════════════════════════════════════════════════════════
    // Summary Sheet
    // ════════════════════════════════════════════════════════

    private void createSummarySheet(XSSFWorkbook wb, Map<String, ProductGroup> groups,
                                     List<String> selectedDropNames, byte[] logoBytes,
                                     StylePack styles) {
        XSSFSheet ws = wb.createSheet("Resumen");
        ws.setDefaultColumnWidth(18);

        int currentRow = 0;

        // ── Logo ──
        if (logoBytes != null) {
            try {
                int pictureIdx = wb.addPicture(logoBytes, Workbook.PICTURE_TYPE_PNG);
                CreationHelper helper = wb.getCreationHelper();
                Drawing<?> drawing = ws.createDrawingPatriarch();
                ClientAnchor anchor = helper.createClientAnchor();
                anchor.setCol1(0);
                anchor.setRow1(0);
                anchor.setCol2(1);
                anchor.setRow2(3);
                drawing.createPicture(anchor, pictureIdx);
                getOrCreateRow(ws, 0).setHeightInPoints(30);
                getOrCreateRow(ws, 1).setHeightInPoints(30);
                getOrCreateRow(ws, 2).setHeightInPoints(30);
                currentRow = 4;
            } catch (Exception e) {
                log.warn("Could not embed logo in Excel: {}", e.getMessage());
            }
        }

        // ── Title ──
        String dateStr = LocalDateTime.now().format(
                DateTimeFormatter.ofPattern("d 'de' MMMM 'de' yyyy", new java.util.Locale("es", "ES")));
        Row titleRow = getOrCreateRow(ws, currentRow);
        Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue("Pedido para Fabricación — " + dateStr);
        titleCell.setCellStyle(styles.title);
        ws.addMergedRegion(new CellRangeAddress(currentRow, currentRow, 0, 4));
        titleRow.setHeightInPoints(28);
        currentRow++;

        // ── Subtitle: selected drops ──
        if (!selectedDropNames.isEmpty()) {
            Row subRow = getOrCreateRow(ws, currentRow);
            Cell subCell = subRow.createCell(0);
            subCell.setCellValue("Drops: " + String.join(", ", selectedDropNames));
            subCell.setCellStyle(styles.subtitle);
            ws.addMergedRegion(new CellRangeAddress(currentRow, currentRow, 0, 4));
            currentRow++;
        }

        // ── Note about excluded statuses ──
        Row noteRow = getOrCreateRow(ws, currentRow);
        Cell noteCell = noteRow.createCell(0);
        noteCell.setCellValue("Nota: Se excluyen automáticamente los pedidos con estado 'Pendiente de Pago' y 'Cancelado'.");
        noteCell.setCellStyle(styles.note);
        ws.addMergedRegion(new CellRangeAddress(currentRow, currentRow, 0, 4));
        currentRow++;

        currentRow++; // blank row

        // ── Table header ──
        int headerRowNum = currentRow;
        String[] headers = {"Producto", "Drop", "Unidades Totales", "Precio Unitario Medio (€)", "Importe Total (€)"};
        Row headerRow = getOrCreateRow(ws, headerRowNum);
        headerRow.setHeightInPoints(22);
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(styles.header);
        }
        currentRow++;

        // ── Data rows ──
        List<ProductGroup> sortedGroups = groups.values().stream()
                .sorted(Comparator.comparingInt(ProductGroup::totalQty).reversed())
                .toList();

        int dataStartRow = currentRow;
        int idx = 0;
        for (ProductGroup g : sortedGroups) {
            Row row = getOrCreateRow(ws, currentRow);
            int qty = g.totalQty();
            BigDecimal totalRevenue = g.totalRevenue();
            BigDecimal avgPrice = qty > 0
                    ? totalRevenue.divide(BigDecimal.valueOf(qty), 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            CellStyle dataStyle = idx % 2 == 0 ? styles.dataAlt1 : styles.dataAlt2;
            CellStyle currStyle = idx % 2 == 0 ? styles.currencyAlt1 : styles.currencyAlt2;
            CellStyle centerStyle = idx % 2 == 0 ? styles.centerAlt1 : styles.centerAlt2;

            Cell c0 = row.createCell(0);
            c0.setCellValue(g.productName);
            c0.setCellStyle(dataStyle);

            Cell c1 = row.createCell(1);
            c1.setCellValue(g.dropName);
            c1.setCellStyle(centerStyle);

            Cell c2 = row.createCell(2);
            c2.setCellValue(qty);
            c2.setCellStyle(centerStyle);

            Cell c3 = row.createCell(3);
            c3.setCellValue(avgPrice.doubleValue());
            c3.setCellStyle(currStyle);

            Cell c4 = row.createCell(4);
            c4.setCellValue(totalRevenue.doubleValue());
            c4.setCellStyle(currStyle);

            currentRow++;
            idx++;
        }

        int lastDataRow = currentRow - 1;

        // ── Totals row ──
        Row totalsRow = getOrCreateRow(ws, currentRow);

        Cell t0 = totalsRow.createCell(0);
        t0.setCellValue("TOTALES");
        t0.setCellStyle(styles.totalsLabel);

        totalsRow.createCell(1).setCellStyle(styles.totals);

        Cell t2 = totalsRow.createCell(2);
        t2.setCellFormula("SUM(C" + (dataStartRow + 1) + ":C" + (lastDataRow + 1) + ")");
        t2.setCellStyle(styles.totalsCenter);

        totalsRow.createCell(3).setCellStyle(styles.totals);

        Cell t4 = totalsRow.createCell(4);
        t4.setCellFormula("SUM(E" + (dataStartRow + 1) + ":E" + (lastDataRow + 1) + ")");
        t4.setCellStyle(styles.totalsCurrency);

        currentRow += 2;

        // ── Statistics section ──
        Row statsTitle = getOrCreateRow(ws, currentRow);
        Cell statsTitleCell = statsTitle.createCell(0);
        statsTitleCell.setCellValue("Estadísticas");
        statsTitleCell.setCellStyle(styles.sectionTitle);
        currentRow++;

        Set<String> uniqueOrders = new HashSet<>();
        int totalUnits = 0;
        BigDecimal totalRevAll = BigDecimal.ZERO;
        for (ProductGroup g : groups.values()) {
            for (ProductGroupItem item : g.items) {
                uniqueOrders.add(item.orderId);
                totalUnits += item.quantity;
                totalRevAll = totalRevAll.add(item.unitPrice.multiply(BigDecimal.valueOf(item.quantity)));
            }
        }

        String[][] stats = {
                {"Total de productos distintos", String.valueOf(groups.size())},
                {"Total de pedidos (únicos)", String.valueOf(uniqueOrders.size())},
                {"Total de unidades", String.valueOf(totalUnits)},
                {"Ingresos totales", totalRevAll.setScale(2, RoundingMode.HALF_UP) + " €"},
        };

        for (String[] stat : stats) {
            Row row = getOrCreateRow(ws, currentRow);
            Cell label = row.createCell(0);
            label.setCellValue(stat[0]);
            label.setCellStyle(styles.statLabel);
            Cell value = row.createCell(1);
            value.setCellValue(stat[1]);
            value.setCellStyle(styles.statValue);
            currentRow++;
        }

        // ── Column widths ──
        ws.setColumnWidth(0, 32 * 256);
        ws.setColumnWidth(1, 20 * 256);
        ws.setColumnWidth(2, 18 * 256);
        ws.setColumnWidth(3, 26 * 256);
        ws.setColumnWidth(4, 20 * 256);

        // ── Freeze panes ──
        ws.createFreezePane(0, headerRowNum + 1);
    }

    // ════════════════════════════════════════════════════════
    // Per-Product Sheet
    // ════════════════════════════════════════════════════════

    private void createProductSheet(XSSFWorkbook wb, ProductGroup group, String sheetName, StylePack styles) {
        XSSFSheet ws = wb.createSheet(sheetName);

        List<ProductOption> productOptions = group.product != null ? group.product.getOptions() : List.of();
        if (productOptions == null) productOptions = List.of();

        // Determine config columns
        List<ConfigColumn> configColumns = getConfigColumns(productOptions, group.items);

        // Build column layout
        String[] fixedStart = {"Nº Pedido", "Cliente", "Email", "Estado Producto", "Fecha"};
        String[] fixedEnd = {"Cantidad", "Precio Unitario (€)", "Subtotal (€)"};

        List<String> allHeaders = new ArrayList<>();
        Collections.addAll(allHeaders, fixedStart);
        configColumns.forEach(c -> allHeaders.add(c.label));
        Collections.addAll(allHeaders, fixedEnd);

        int qtyColIdx = fixedStart.length + configColumns.size();
        int priceColIdx = qtyColIdx + 1;
        int subtotalColIdx = priceColIdx + 1;

        int currentRow = 0;

        // ── Product title ──
        Row titleRow = getOrCreateRow(ws, currentRow);
        Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue(group.productName);
        titleCell.setCellStyle(styles.productTitle);
        ws.addMergedRegion(new CellRangeAddress(currentRow, currentRow, 0, Math.max(allHeaders.size() - 1, 0)));
        titleRow.setHeightInPoints(24);
        currentRow++;

        // ── Product metadata ──
        String[][] meta = {
                {"Drop:", group.dropName},
                {"Total unidades:", String.valueOf(group.totalQty())},
                {"Total pedidos:", String.valueOf(group.items.size())},
        };
        for (String[] m : meta) {
            Row row = getOrCreateRow(ws, currentRow);
            Cell label = row.createCell(0);
            label.setCellValue(m[0]);
            label.setCellStyle(styles.metaLabel);
            Cell value = row.createCell(1);
            value.setCellValue(m[1]);
            value.setCellStyle(styles.metaValue);
            currentRow++;
        }

        currentRow++; // blank separator

        // ── Column headers ──
        int headerRowNum = currentRow;
        Row headerRow = getOrCreateRow(ws, headerRowNum);
        headerRow.setHeightInPoints(22);
        for (int i = 0; i < allHeaders.size(); i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(allHeaders.get(i));
            cell.setCellStyle(styles.header);
        }
        currentRow++;

        // ── Data rows ──
        int dataStartRow = currentRow;

        List<ProductGroupItem> sortedItems = group.items.stream()
                .sorted(Comparator.comparing(ProductGroupItem::clientName)
                        .thenComparing(ProductGroupItem::orderId))
                .toList();

        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        int idx = 0;

        for (ProductGroupItem item : sortedItems) {
            Row row = getOrCreateRow(ws, currentRow);
            int excelRow = currentRow + 1; // 1-based for formulas

            CellStyle dataStyle = idx % 2 == 0 ? styles.dataAlt1 : styles.dataAlt2;
            CellStyle centerStyle = idx % 2 == 0 ? styles.centerAlt1 : styles.centerAlt2;
            CellStyle currStyle = idx % 2 == 0 ? styles.currencyAlt1 : styles.currencyAlt2;
            CellStyle dateStyle = idx % 2 == 0 ? styles.dateAlt1 : styles.dateAlt2;
            CellStyle boldCenterStyle = idx % 2 == 0 ? styles.boldCenterAlt1 : styles.boldCenterAlt2;

            // Fixed start columns
            Cell c0 = row.createCell(0);
            c0.setCellValue(item.orderId);
            c0.setCellStyle(dataStyle);

            Cell c1 = row.createCell(1);
            c1.setCellValue(item.clientName);
            c1.setCellStyle(dataStyle);

            Cell c2 = row.createCell(2);
            c2.setCellValue(item.clientEmail);
            c2.setCellStyle(dataStyle);

            Cell c3 = row.createCell(3);
            c3.setCellValue(resolveProductStatus(item.productStatus));
            c3.setCellStyle(centerStyle);

            Cell c4 = row.createCell(4);
            if (item.orderDate != null) {
                c4.setCellValue(item.orderDate.format(dateFmt));
            }
            c4.setCellStyle(dateStyle);

            // Config columns
            for (int colIdx = 0; colIdx < configColumns.size(); colIdx++) {
                int cellIdx = fixedStart.length + colIdx;
                Cell cell = row.createCell(cellIdx);
                String resolved = resolveConfigValue(
                        configColumns.get(colIdx),
                        item.configParsed.get(configColumns.get(colIdx).key),
                        productOptions);
                cell.setCellValue(resolved);
                cell.setCellStyle(centerStyle);
            }

            // Quantity
            Cell qtyCell = row.createCell(qtyColIdx);
            qtyCell.setCellValue(item.quantity);
            qtyCell.setCellStyle(boldCenterStyle);

            // Unit price
            Cell priceCell = row.createCell(priceColIdx);
            priceCell.setCellValue(item.unitPrice.doubleValue());
            priceCell.setCellStyle(currStyle);

            // Subtotal formula
            Cell subtotalCell = row.createCell(subtotalColIdx);
            String qtyCol = getColLetter(qtyColIdx);
            String priceCol = getColLetter(priceColIdx);
            subtotalCell.setCellFormula(qtyCol + excelRow + "*" + priceCol + excelRow);
            subtotalCell.setCellStyle(currStyle);

            currentRow++;
            idx++;
        }

        int lastDataRow = currentRow - 1;

        // ── Totals row ──
        Row totalsRow = getOrCreateRow(ws, currentRow);

        // "TOTALES:" label in column before quantity
        if (qtyColIdx > 0) {
            Cell labelCell = totalsRow.createCell(qtyColIdx - 1);
            labelCell.setCellValue("TOTALES:");
            labelCell.setCellStyle(styles.totalsLabelRight);
        }

        // Fill empty totals cells with style
        for (int c = 0; c < qtyColIdx - 1; c++) {
            totalsRow.createCell(c).setCellStyle(styles.totals);
        }

        // SUM quantity
        Cell qtyTotalCell = totalsRow.createCell(qtyColIdx);
        qtyTotalCell.setCellFormula("SUM(" + getColLetter(qtyColIdx) + (dataStartRow + 1)
                + ":" + getColLetter(qtyColIdx) + (lastDataRow + 1) + ")");
        qtyTotalCell.setCellStyle(styles.totalsCenter);

        // AVERAGE price
        Cell priceTotalCell = totalsRow.createCell(priceColIdx);
        if (dataStartRow <= lastDataRow) {
            priceTotalCell.setCellFormula("AVERAGE(" + getColLetter(priceColIdx) + (dataStartRow + 1)
                    + ":" + getColLetter(priceColIdx) + (lastDataRow + 1) + ")");
        }
        priceTotalCell.setCellStyle(styles.totalsCurrency);

        // SUM subtotal
        Cell subtotalTotalCell = totalsRow.createCell(subtotalColIdx);
        subtotalTotalCell.setCellFormula("SUM(" + getColLetter(subtotalColIdx) + (dataStartRow + 1)
                + ":" + getColLetter(subtotalColIdx) + (lastDataRow + 1) + ")");
        subtotalTotalCell.setCellStyle(styles.totalsCurrency);

        // ── Column widths ──
        int[] fixedStartWidths = {14, 24, 28, 18, 14};
        int[] fixedEndWidths = {12, 18, 18};
        for (int i = 0; i < allHeaders.size(); i++) {
            int width;
            if (i < fixedStart.length) {
                width = fixedStartWidths[i];
            } else if (i < fixedStart.length + configColumns.size()) {
                width = 18;
            } else {
                width = fixedEndWidths[i - fixedStart.length - configColumns.size()];
            }
            ws.setColumnWidth(i, width * 256);
        }

        // ── Freeze panes ──
        ws.createFreezePane(1, headerRowNum + 1);

        // ── Auto-filter ──
        if (lastDataRow >= headerRowNum) {
            ws.setAutoFilter(new CellRangeAddress(headerRowNum, lastDataRow, 0, allHeaders.size() - 1));
        }
    }

    // ════════════════════════════════════════════════════════
    // Config Column Resolution
    // ════════════════════════════════════════════════════════

    private List<ConfigColumn> getConfigColumns(List<ProductOption> productOptions, List<ProductGroupItem> items) {
        if (productOptions != null && !productOptions.isEmpty()) {
            return productOptions.stream()
                    .map(opt -> new ConfigColumn(opt.getName(), opt.getName(), opt.getType()))
                    .toList();
        }
        // Fallback: infer from config keys across all items
        Set<String> keys = new LinkedHashSet<>();
        for (ProductGroupItem item : items) {
            keys.addAll(item.configParsed.keySet());
        }
        return keys.stream()
                .sorted()
                .map(k -> new ConfigColumn(k, k, "text_input"))
                .toList();
    }

    private String resolveConfigValue(ConfigColumn col, Object rawValue, List<ProductOption> productOptions) {
        if (rawValue == null || "".equals(rawValue)) {
            return "—";
        }

        // Boolean / checkbox
        if ("checkbox".equals(col.type) || rawValue instanceof Boolean) {
            return Boolean.TRUE.equals(rawValue) ? "Sí" : "No";
        }

        // Select — resolve id to label
        if ("select".equals(col.type) && productOptions != null) {
            ProductOption option = productOptions.stream()
                    .filter(o -> col.key.equals(o.getName()))
                    .findFirst()
                    .orElse(null);
            if (option != null && option.getValues() != null) {
                for (OptionValue v : option.getValues()) {
                    if (rawValue.equals(v.getId()) || rawValue.equals(v.getLabel())) {
                        return v.getLabel();
                    }
                }
            }
            // If rawValue is a map with "label" key
            if (rawValue instanceof Map<?, ?> map && map.containsKey("label")) {
                return String.valueOf(map.get("label"));
            }
            return String.valueOf(rawValue);
        }

        // Object with label (fallback for unknown types)
        if (rawValue instanceof Map<?, ?> map && map.containsKey("label")) {
            return String.valueOf(map.get("label"));
        }

        return String.valueOf(rawValue);
    }

    private String resolveProductStatus(OrderProductStatus status) {
        if (status == null) return "—";
        return PRODUCT_STATUS_LABELS.getOrDefault(status, status.name());
    }

    // ════════════════════════════════════════════════════════
    // Helpers
    // ════════════════════════════════════════════════════════

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

    private static Row getOrCreateRow(Sheet sheet, int rowIdx) {
        Row row = sheet.getRow(rowIdx);
        return row != null ? row : sheet.createRow(rowIdx);
    }

    private static String getColLetter(int index) {
        StringBuilder sb = new StringBuilder();
        int i = index;
        while (i >= 0) {
            sb.insert(0, (char) ('A' + (i % 26)));
            i = i / 26 - 1;
        }
        return sb.toString();
    }

    private static String getUniqueSheetName(String name, Set<String> existingNames) {
        String sanitized = name.replaceAll("[\\\\/:*?\\[\\]]", "-");
        if (sanitized.length() > 31) sanitized = sanitized.substring(0, 31);
        if (!existingNames.contains(sanitized)) return sanitized;

        for (int i = 2; i < 100; i++) {
            String suffix = " (" + i + ")";
            String candidate = sanitized.substring(0, Math.min(sanitized.length(), 31 - suffix.length())) + suffix;
            if (!existingNames.contains(candidate)) return candidate;
        }
        return sanitized;
    }

    // ════════════════════════════════════════════════════════
    // Styles
    // ════════════════════════════════════════════════════════

    private StylePack createStyles(XSSFWorkbook wb) {
        StylePack s = new StylePack();

        // ── Fonts ──
        XSSFFont titleFont = wb.createFont();
        titleFont.setFontName("Calibri");
        titleFont.setFontHeightInPoints((short) 16);
        titleFont.setBold(true);
        titleFont.setColor(xssfColor(BRAND_PRIMARY_DARK));

        XSSFFont productTitleFont = wb.createFont();
        productTitleFont.setFontName("Calibri");
        productTitleFont.setFontHeightInPoints((short) 14);
        productTitleFont.setBold(true);
        productTitleFont.setColor(xssfColor(BRAND_PRIMARY_DARK));

        XSSFFont sectionTitleFont = wb.createFont();
        sectionTitleFont.setFontName("Calibri");
        sectionTitleFont.setFontHeightInPoints((short) 13);
        sectionTitleFont.setBold(true);
        sectionTitleFont.setColor(xssfColor(BRAND_PRIMARY_DARK));

        XSSFFont headerFont = wb.createFont();
        headerFont.setFontName("Calibri");
        headerFont.setFontHeightInPoints((short) 11);
        headerFont.setBold(true);
        headerFont.setColor(new XSSFColor(new byte[]{(byte) 0xFF, (byte) 0xFF, (byte) 0xFF}, null));

        XSSFFont subtitleFont = wb.createFont();
        subtitleFont.setFontName("Calibri");
        subtitleFont.setFontHeightInPoints((short) 11);
        subtitleFont.setItalic(true);
        subtitleFont.setColor(xssfColor(GRAY_600));

        XSSFFont noteFont = wb.createFont();
        noteFont.setFontName("Calibri");
        noteFont.setFontHeightInPoints((short) 9);
        noteFont.setItalic(true);
        noteFont.setColor(xssfColor(GRAY_400));

        XSSFFont dataFont = wb.createFont();
        dataFont.setFontName("Calibri");
        dataFont.setFontHeightInPoints((short) 10);

        XSSFFont dataBoldFont = wb.createFont();
        dataBoldFont.setFontName("Calibri");
        dataBoldFont.setFontHeightInPoints((short) 10);
        dataBoldFont.setBold(true);

        XSSFFont totalsFont = wb.createFont();
        totalsFont.setFontName("Calibri");
        totalsFont.setFontHeightInPoints((short) 11);
        totalsFont.setBold(true);
        totalsFont.setColor(xssfColor(TOTALS_FONT_COLOR));

        XSSFFont totals10Font = wb.createFont();
        totals10Font.setFontName("Calibri");
        totals10Font.setFontHeightInPoints((short) 10);
        totals10Font.setBold(true);
        totals10Font.setColor(xssfColor(TOTALS_FONT_COLOR));

        XSSFFont metaLabelFont = wb.createFont();
        metaLabelFont.setFontName("Calibri");
        metaLabelFont.setFontHeightInPoints((short) 10);
        metaLabelFont.setBold(true);
        metaLabelFont.setColor(xssfColor(DARK_TEXT));

        XSSFFont metaValueFont = wb.createFont();
        metaValueFont.setFontName("Calibri");
        metaValueFont.setFontHeightInPoints((short) 10);

        XSSFFont statLabelFont = wb.createFont();
        statLabelFont.setFontName("Calibri");
        statLabelFont.setFontHeightInPoints((short) 10);
        statLabelFont.setColor(xssfColor(DARK_TEXT));

        XSSFFont statValueFont = wb.createFont();
        statValueFont.setFontName("Calibri");
        statValueFont.setFontHeightInPoints((short) 10);
        statValueFont.setBold(true);

        // ── Currency format ──
        short currencyFmt = wb.createDataFormat().getFormat("#,##0.00 €");
        short dateFmt = wb.createDataFormat().getFormat("DD/MM/YYYY");

        // ── Title ──
        s.title = wb.createCellStyle();
        s.title.setFont(titleFont);

        // ── Product title ──
        s.productTitle = wb.createCellStyle();
        s.productTitle.setFont(productTitleFont);

        // ── Section title ──
        s.sectionTitle = wb.createCellStyle();
        s.sectionTitle.setFont(sectionTitleFont);

        // ── Subtitle ──
        s.subtitle = wb.createCellStyle();
        s.subtitle.setFont(subtitleFont);

        // ── Note ──
        s.note = wb.createCellStyle();
        s.note.setFont(noteFont);

        // ── Header ──
        s.header = wb.createCellStyle();
        s.header.setFont(headerFont);
        s.header.setFillForegroundColor(xssfColor(BRAND_PRIMARY));
        s.header.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        s.header.setAlignment(HorizontalAlignment.CENTER);
        s.header.setVerticalAlignment(VerticalAlignment.CENTER);
        s.header.setWrapText(true);
        applyThinBorders(s.header, wb);

        // ── Data alternating rows ──
        s.dataAlt1 = createDataStyle(wb, dataFont, BRAND_LIGHT, null, HorizontalAlignment.LEFT);
        s.dataAlt2 = createDataStyle(wb, dataFont, null, null, HorizontalAlignment.LEFT);

        s.centerAlt1 = createDataStyle(wb, dataFont, BRAND_LIGHT, null, HorizontalAlignment.CENTER);
        s.centerAlt2 = createDataStyle(wb, dataFont, null, null, HorizontalAlignment.CENTER);

        s.currencyAlt1 = createDataStyle(wb, dataFont, BRAND_LIGHT, currencyFmt, HorizontalAlignment.RIGHT);
        s.currencyAlt2 = createDataStyle(wb, dataFont, null, currencyFmt, HorizontalAlignment.RIGHT);

        s.dateAlt1 = createDataStyle(wb, dataFont, BRAND_LIGHT, dateFmt, HorizontalAlignment.CENTER);
        s.dateAlt2 = createDataStyle(wb, dataFont, null, dateFmt, HorizontalAlignment.CENTER);

        s.boldCenterAlt1 = createDataStyle(wb, dataBoldFont, BRAND_LIGHT, null, HorizontalAlignment.CENTER);
        s.boldCenterAlt2 = createDataStyle(wb, dataBoldFont, null, null, HorizontalAlignment.CENTER);

        // ── Totals ──
        s.totals = createTotalsStyle(wb, totalsFont, null);
        s.totalsLabel = createTotalsStyle(wb, totalsFont, null);
        s.totalsLabel.setAlignment(HorizontalAlignment.LEFT);
        s.totalsLabelRight = createTotalsStyle(wb, totals10Font, null);
        s.totalsLabelRight.setAlignment(HorizontalAlignment.RIGHT);
        s.totalsCenter = createTotalsStyle(wb, totalsFont, null);
        s.totalsCenter.setAlignment(HorizontalAlignment.CENTER);
        s.totalsCurrency = createTotalsStyle(wb, totalsFont, currencyFmt);
        s.totalsCurrency.setAlignment(HorizontalAlignment.RIGHT);

        // ── Meta ──
        s.metaLabel = wb.createCellStyle();
        s.metaLabel.setFont(metaLabelFont);

        s.metaValue = wb.createCellStyle();
        s.metaValue.setFont(metaValueFont);

        // ── Stats ──
        s.statLabel = wb.createCellStyle();
        s.statLabel.setFont(statLabelFont);

        s.statValue = wb.createCellStyle();
        s.statValue.setFont(statValueFont);

        return s;
    }

    private XSSFCellStyle createDataStyle(XSSFWorkbook wb, XSSFFont font, byte[] fillColor,
                                           Short dataFormat, HorizontalAlignment alignment) {
        XSSFCellStyle style = wb.createCellStyle();
        style.setFont(font);
        if (fillColor != null) {
            style.setFillForegroundColor(xssfColor(fillColor));
            style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        }
        if (dataFormat != null) {
            style.setDataFormat(dataFormat);
        }
        style.setAlignment(alignment);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        applyThinBorders(style, wb);
        return style;
    }

    private XSSFCellStyle createTotalsStyle(XSSFWorkbook wb, XSSFFont font, Short dataFormat) {
        XSSFCellStyle style = wb.createCellStyle();
        style.setFont(font);
        style.setFillForegroundColor(xssfColor(TOTALS_BG));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        if (dataFormat != null) {
            style.setDataFormat(dataFormat);
        }
        applyThinBorders(style, wb);
        return style;
    }

    private void applyThinBorders(XSSFCellStyle style, XSSFWorkbook wb) {
        XSSFColor borderColor = xssfColor(BORDER_COLOR);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setTopBorderColor(borderColor);
        style.setBottomBorderColor(borderColor);
        style.setLeftBorderColor(borderColor);
        style.setRightBorderColor(borderColor);
    }

    private static XSSFColor xssfColor(byte[] rgb) {
        return new XSSFColor(rgb, null);
    }

    // ════════════════════════════════════════════════════════
    // Inner Data Classes
    // ════════════════════════════════════════════════════════

    private static class StylePack {
        XSSFCellStyle title;
        XSSFCellStyle productTitle;
        XSSFCellStyle sectionTitle;
        XSSFCellStyle subtitle;
        XSSFCellStyle note;
        XSSFCellStyle header;
        XSSFCellStyle dataAlt1;
        XSSFCellStyle dataAlt2;
        XSSFCellStyle centerAlt1;
        XSSFCellStyle centerAlt2;
        XSSFCellStyle currencyAlt1;
        XSSFCellStyle currencyAlt2;
        XSSFCellStyle dateAlt1;
        XSSFCellStyle dateAlt2;
        XSSFCellStyle boldCenterAlt1;
        XSSFCellStyle boldCenterAlt2;
        XSSFCellStyle totals;
        XSSFCellStyle totalsLabel;
        XSSFCellStyle totalsLabelRight;
        XSSFCellStyle totalsCenter;
        XSSFCellStyle totalsCurrency;
        XSSFCellStyle metaLabel;
        XSSFCellStyle metaValue;
        XSSFCellStyle statLabel;
        XSSFCellStyle statValue;
    }

    private record ConfigColumn(String key, String label, String type) {}

    private static class ProductGroup {
        final String productId;
        final String productName;
        final String dropName;
        final String dropId;
        final Product product;
        final List<ProductGroupItem> items = new ArrayList<>();

        ProductGroup(String productId, String productName, String dropName, String dropId, Product product) {
            this.productId = productId;
            this.productName = productName;
            this.dropName = dropName;
            this.dropId = dropId;
            this.product = product;
        }

        int totalQty() {
            return items.stream().mapToInt(i -> i.quantity).sum();
        }

        BigDecimal totalRevenue() {
            return items.stream()
                    .map(i -> i.unitPrice.multiply(BigDecimal.valueOf(i.quantity)))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }
    }

    private record ProductGroupItem(
            String orderId,
            String clientName,
            String clientEmail,
            OrderStatus orderStatus,
            LocalDateTime orderDate,
            int quantity,
            BigDecimal unitPrice,
            Map<String, Object> configParsed,
            OrderProductStatus productStatus
    ) {}
}
