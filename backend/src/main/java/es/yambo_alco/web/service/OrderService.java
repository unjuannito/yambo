package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ForbiddenException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.Issue;
import es.yambo_alco.web.model.FamilyProduct;
import es.yambo_alco.web.model.FamilyProductRoleAccess;
import es.yambo_alco.web.model.NotificationPreferences;
import es.yambo_alco.web.model.Order;
import es.yambo_alco.web.model.OrderFilter;
import es.yambo_alco.web.model.OrderProduct;
import es.yambo_alco.web.model.OrderStatusHistory;
import es.yambo_alco.web.model.Product;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.IssueStatus;
import es.yambo_alco.web.model.enums.OrderStatus;
import es.yambo_alco.web.repository.IssueRepository;
import es.yambo_alco.web.repository.OrderProductRepository;
import es.yambo_alco.web.repository.OrderRepository;
import es.yambo_alco.web.repository.OrderStatusHistoryRepository;
import es.yambo_alco.web.repository.ProductRepository;
import es.yambo_alco.web.repository.UploadedFileRepository;
import es.yambo_alco.web.repository.UserRepository;
import es.yambo_alco.web.repository.spec.OrderSpecifications;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import jakarta.persistence.criteria.Subquery;

@Service
@RequiredArgsConstructor
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private final OrderRepository orderRepository;
    private final OrderProductRepository orderProductRepository;
    private final ProductRepository productRepository;
    private final UploadedFileRepository uploadedFileRepository;
    private final UserRepository userRepository;
    private final IssueRepository issueRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final AuthService authService;
    private final MailService mailService;
    private final UserService userService;
    private final ProductService productService;
    private final IssueService issueService;

    @Transactional
    public Order createOrder(@NonNull String customerId, @NonNull List<OrderProduct> orderProducts) {
        if (orderProducts.isEmpty()) {
            throw new BadRequestException("Order must contain at least one product");
        }

        LocalDateTime now = LocalDateTime.now();

        for (OrderProduct op : orderProducts) {
            Product product = productRepository.findById(op.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + op.getProductId()));

            validateProductAccessForOrder(customerId, product, now);

            BigDecimal calculatedPrice = calculatePrice(product, op.getConfiguration());
            op.setPrice(calculatedPrice);
        }

        Order order = Order.builder()
                .customerId(customerId)
                .status(OrderStatus.PENDING_PAYMENT)
                .createdAt(now)
                .build();

        order = orderRepository.save(order);

        for (OrderProduct op : orderProducts) {
            op.setOrderId(order.getId());
            orderProductRepository.save(op);
        }

        recordStatusChange(order.getId(), null, OrderStatus.PENDING_PAYMENT, customerId);

        try {
            sendOrderStatusUpdateEmail(order, OrderStatus.PENDING_PAYMENT);
        } catch (Exception e) {
            log.error("Failed to send order creation email for order: {}. Order created successfully.", order.getId(),
                    e);
        }

        return order;
    }

    /**
     * Crea un pedido en nombre de un socio (admin) con justificación obligatoria.
     * Tras crear el pedido, crea una incidencia vinculada a sus productos con la
     * justificación como descripción (trazabilidad: issue #78 / PR #77).
     */
    @Transactional
    public Order createOrderWithJustification(@NonNull String customerId, @NonNull List<OrderProduct> orderProducts,
            @NonNull String justification, @NonNull String adminUserId) {
        if (justification == null || justification.isBlank()) {
            throw new BadRequestException("Justification is required when creating an order for another user");
        }
        Order order = createOrder(customerId, orderProducts);
        Issue issue = createJustificationIssue(order.getId(), justification, adminUserId, "creado");
        try {
            sendOrderAdminUpdateEmail(order, "creado", justification, issue.getId(), List.of(), null);
        } catch (Exception e) {
            log.error("Failed to send admin-created email for order: {}. Order created successfully.",
                    order.getId(), e);
        }
        return order;
    }

    /**
     * Crea la incidencia de justificación para un pedido gestionado por un admin.
     * La incidencia se vincula a todos los order_product del pedido.
     */
    private Issue createJustificationIssue(String orderId, String justification, String adminUserId, String action) {
        List<OrderProduct> orderProducts = getOrderProducts(orderId);
        List<UUID> orderedProductIds = orderProducts.stream()
                .map(OrderProduct::getId)
                .toList();
        String title = String.format("Pedido %s por administración", action);
        return issueService.createIssue(orderedProductIds, title, justification, adminUserId, true);
    }

    /**
     * Reemplaza los productos de un pedido existente (edición admin).
     * Solo permitido si el pedido no está en estado final (CLOSED/CANCELED).
     */
    @Transactional
    public Order updateOrderProducts(@NonNull String orderId, @NonNull List<OrderProduct> orderProducts) {
        if (orderProducts.isEmpty()) {
            throw new BadRequestException("Order must contain at least one product");
        }

        Order order = getOrderById(orderId);

        if (order.getStatus() == OrderStatus.CLOSED || order.getStatus() == OrderStatus.CANCELED) {
            throw new BadRequestException("Cannot edit an order in status " + order.getStatus());
        }

        LocalDateTime now = LocalDateTime.now();

        for (OrderProduct op : orderProducts) {
            Product product = productRepository.findById(op.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + op.getProductId()));

            validateProductAccessForOrder(order.getCustomerId(), product, now);

            BigDecimal calculatedPrice = calculatePrice(product, op.getConfiguration());
            op.setPrice(calculatedPrice);
        }

        // MERGE preservando IDs de order_product existentes:
        // issue.ordered_product_id tiene FK onDelete=CASCADE → si borramos los
        // order_product (deleteByOrderId) las incidencias vinculadas (incluida la
        // de justificación) se borran en cascada. En su lugar:
        //  - línea que coincide (productId + configuration) → se actualiza (conserva ID)
        //  - línea nueva → se crea
        //  - línea existente que ya no está → se borra (solo esa)
        List<OrderProduct> existing = getOrderProducts(orderId);
        List<OrderProduct> toDelete = new ArrayList<>();

        for (OrderProduct existingOp : existing) {
            boolean stillPresent = orderProducts.stream().anyMatch(newOp ->
                    newOp.getProductId().equals(existingOp.getProductId())
                            && java.util.Objects.equals(normalizeConfig(newOp.getConfiguration()),
                                    normalizeConfig(existingOp.getConfiguration())));
            if (!stillPresent) {
                toDelete.add(existingOp);
            }
        }
        for (OrderProduct op : toDelete) {
            orderProductRepository.delete(op);
        }

        for (OrderProduct newOp : orderProducts) {
            OrderProduct matched = existing.stream()
                    .filter(existingOp -> existingOp.getProductId().equals(newOp.getProductId())
                            && java.util.Objects.equals(normalizeConfig(newOp.getConfiguration()),
                                    normalizeConfig(existingOp.getConfiguration())))
                    .findFirst()
                    .orElse(null);
            if (matched != null) {
                // Actualizar el existente: conserva el ID (y las incidencias vinculadas)
                matched.setQuantity(newOp.getQuantity());
                matched.setPrice(newOp.getPrice());
                matched.setConfiguration(newOp.getConfiguration());
                orderProductRepository.save(matched);
            } else {
                newOp.setOrderId(orderId);
                orderProductRepository.save(newOp);
            }
        }

        return order;
    }

    private String normalizeConfig(String configuration) {
        if (configuration == null) return null;
        return configuration.isBlank() || "{}".equals(configuration.trim()) ? null : configuration.trim();
    }

    /**
     * Edita un pedido (admin) con justificación obligatoria.
     * Tras actualizar los productos, crea una incidencia vinculada con la
     * justificación como descripción (trazabilidad: issue #78 / PR #77).
     */
    @Transactional
    public Order updateOrderProductsWithJustification(@NonNull String orderId,
            @NonNull List<OrderProduct> orderProducts,
            @NonNull String justification, @NonNull String adminUserId) {
        if (justification == null || justification.isBlank()) {
            throw new BadRequestException("Justification is required when editing an order");
        }
        List<OrderProduct> before = getOrderProducts(orderId);
        Order order = updateOrderProducts(orderId, orderProducts);
        Issue issue = createJustificationIssue(orderId, justification, adminUserId, "modificado");
        List<MailService.OrderProductRow> rows = buildOrderRows(before, getOrderProducts(orderId));
        try {
            sendOrderAdminUpdateEmail(order, "modificado", justification, issue.getId(), rows,
                    computeTotalPrice(before));
        } catch (Exception e) {
            log.error("Failed to send admin-modified email for order: {}. Order updated successfully.",
                    orderId, e);
        }
        return order;
    }

    /**
     * Envía un correo al socio informándole de que un administrador ha creado
     * o modificado su pedido (issue #76). Respeta la preferencia orderStatus.
     */
    private void sendOrderAdminUpdateEmail(Order order, String action, String justification, String issueId,
            List<MailService.OrderProductRow> rows, BigDecimal oldTotalPrice) {
        Optional<User> recipient = resolveEmailRecipient(order);
        if (recipient.isEmpty()) {
            return;
        }
        User user = recipient.get();

        NotificationPreferences prefs = userService.getNotificationPreferences(user.getId());
        if (!prefs.isOrderStatus()) {
            log.info("Skipping admin update email for order {}: user {} has disabled order status notifications",
                    order.getId(), user.getId());
            return;
        }

        List<OrderProduct> orderProducts = getOrderProducts(order.getId());
        mailService.sendOrderAdminUpdate(
                user.getEmail(),
                user.getName(),
                order.getId(),
                order.getCreatedAt(),
                action,
                buildProductInfos(orderProducts),
                computeTotalPrice(orderProducts),
                justification,
                issueId,
                rows,
                oldTotalPrice,
                order.getStatus());
    }

    /**
     * Construye las filas del pedido para el correo de administración,
     * comparando el antes y el después (añadidas, eliminadas, modificadas y sin
     * cambios). Cada fila desglosa los cambios por valor (cantidad, opciones y
     * precio) para que solo lo modificado llame la atención.
     */
    private List<MailService.OrderProductRow> buildOrderRows(List<OrderProduct> before,
            List<OrderProduct> after) {
        List<MailService.OrderProductRow> rows = new ArrayList<>();
        List<OrderProduct> remainingBefore = new ArrayList<>(before);

        for (OrderProduct afterOp : after) {
            OrderProduct beforeOp = findSameLine(remainingBefore, afterOp);
            if (beforeOp == null) {
                beforeOp = findSameProduct(remainingBefore, afterOp.getProductId());
            }
            if (beforeOp == null) {
                rows.add(buildRow("added", afterOp, null));
                continue;
            }
            remainingBefore.remove(beforeOp);

            boolean quantityChanged = !java.util.Objects.equals(beforeOp.getQuantity(), afterOp.getQuantity());
            boolean priceChanged = beforeOp.getPrice() != null && afterOp.getPrice() != null
                    && beforeOp.getPrice().compareTo(afterOp.getPrice()) != 0;
            boolean optionsChanged = !java.util.Objects.equals(normalizeConfig(beforeOp.getConfiguration()),
                    normalizeConfig(afterOp.getConfiguration()));

            String type = (!quantityChanged && !priceChanged && !optionsChanged) ? "unchanged" : "modified";
            rows.add(buildRow(type, afterOp, beforeOp));
        }

        for (OrderProduct beforeOp : remainingBefore) {
            rows.add(buildRow("removed", null, beforeOp));
        }

        return rows;
    }

    private OrderProduct findSameLine(List<OrderProduct> list, OrderProduct target) {
        return list.stream()
                .filter(op -> op.getProductId().equals(target.getProductId())
                        && java.util.Objects.equals(normalizeConfig(op.getConfiguration()),
                                normalizeConfig(target.getConfiguration())))
                .findFirst()
                .orElse(null);
    }

    private OrderProduct findSameProduct(List<OrderProduct> list, String productId) {
        return list.stream()
                .filter(op -> op.getProductId().equals(productId))
                .findFirst()
                .orElse(null);
    }

    private String productName(OrderProduct op) {
        Product product = productRepository.findById(op.getProductId()).orElse(null);
        return product != null ? product.getName() : "Producto";
    }

    private MailService.OrderProductRow buildRow(String type, OrderProduct after, OrderProduct before) {
        OrderProduct base = after != null ? after : before;
        Product product = productRepository.findById(base.getProductId()).orElse(null);

        Integer oldQuantity = before != null ? before.getQuantity() : null;
        Integer newQuantity = after != null ? after.getQuantity() : null;
        boolean quantityChanged = oldQuantity != null && newQuantity != null && !oldQuantity.equals(newQuantity);

        List<MailService.OrderProductOptionChange> options = buildOptionChanges(before, after, product);

        String oldPriceText = before != null ? formatPrice(before.getPrice()) : "";
        String newPriceText = after != null ? formatPrice(after.getPrice()) : "";
        boolean priceChanged = before != null && after != null
                && before.getPrice() != null && after.getPrice() != null
                && before.getPrice().compareTo(after.getPrice()) != 0;

        return new MailService.OrderProductRow(type, productName(base),
                oldQuantity, newQuantity, quantityChanged,
                options, oldPriceText, newPriceText, priceChanged);
    }

    private List<MailService.OrderProductOptionChange> buildOptionChanges(OrderProduct before, OrderProduct after,
            Product product) {
        java.util.Map<String, String> oldOptions = before != null
                ? productService.formatOptionMap(before.getConfiguration(), product)
                : java.util.Map.of();
        java.util.Map<String, String> newOptions = after != null
                ? productService.formatOptionMap(after.getConfiguration(), product)
                : java.util.Map.of();

        java.util.LinkedHashSet<String> keys = new java.util.LinkedHashSet<>(oldOptions.keySet());
        keys.addAll(newOptions.keySet());

        List<MailService.OrderProductOptionChange> changes = new ArrayList<>();
        for (String key : keys) {
            String oldText = oldOptions.getOrDefault(key, "");
            String newText = newOptions.getOrDefault(key, "");
            String kind;
            if (oldText.isEmpty() && !newText.isEmpty()) {
                kind = "added";
            } else if (!oldText.isEmpty() && newText.isEmpty()) {
                kind = "removed";
            } else if (!oldText.isEmpty() && oldText.equals(newText)) {
                kind = "unchanged";
            } else {
                kind = "changed";
            }
            changes.add(new MailService.OrderProductOptionChange(kind, key, oldText, newText));
        }
        return changes;
    }

    private String formatPrice(BigDecimal price) {
        if (price == null) return "0,00 €";
        return price.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString().replace('.', ',') + " €";
    }

    private BigDecimal calculatePrice(Product product, String configurationJson) {
        return productService.calculatePrice(product, configurationJson);
    }

    private void validateProductAccessForOrder(String customerId, Product product, LocalDateTime now) {
        // El acceso a un drop se valida contra el SOCIO dueño del pedido,
        // no contra el admin que lo crea/edita (issue #76).
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + customerId));
        validateProductAccess(customer, product, now);
    }

    private void validateProductAccess(User user, Product product, LocalDateTime now) {
        // If product has no family, it's accessible to all
        if (product.getFamilyProduct() == null) {
            return;
        }

        FamilyProduct family = product.getFamilyProduct();

        if (now.isBefore(family.getStartTms())) {
            throw new BadRequestException(
                    String.format("Product '%s' is not yet available. Available from: %s",
                            product.getName(), family.getStartTms()));
        }
        if (now.isAfter(family.getEndTms())) {
            throw new BadRequestException(
                    String.format("Product '%s' is no longer available. Expired on: %s",
                            product.getName(), family.getEndTms()));
        }

        if (!FamilyProductRoleAccess.userHasAccess(user, family.getRoleAccess())) {
            throw new BadRequestException(
                    String.format("You don't have access to product '%s'", product.getName()));
        }
    }

    public Order getOrderById(@NonNull String orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
    }

    public Page<Order> listOrders(OrderFilter filter, @NonNull Pageable pageable) {
        Specification<Order> spec = Specification.where(null);

        if (filter.query() != null && !filter.query().isBlank()) {
            String pattern = "%" + filter.query().toLowerCase() + "%";
            spec = spec.and((root, q, cb) -> {
                Subquery<String> nameSubquery = q.subquery(String.class);
                jakarta.persistence.criteria.Root<User> userRoot = nameSubquery.from(User.class);
                nameSubquery.select(userRoot.get("id"))
                    .where(cb.like(cb.lower(userRoot.get("name")), pattern));
                return cb.or(
                    cb.like(cb.lower(root.get("id")), pattern),
                    root.get("customerId").in(nameSubquery)
                );
            });
        }
        if (filter.orderId() != null) {
            spec = spec.and(OrderSpecifications.idContains(filter.orderId()));
        }
        if (filter.customerName() != null) {
            spec = spec.and(OrderSpecifications.customerNameContains(filter.customerName()));
        }
        if (filter.customerId() != null) {
            spec = spec.and(OrderSpecifications.customerIdEquals(filter.customerId()));
        }
        if (filter.statuses() != null && !filter.statuses().isEmpty()) {
            spec = spec.and(OrderSpecifications.statusIn(filter.statuses()));
        }
        if (filter.startDate() != null || filter.endDate() != null) {
            spec = spec.and(OrderSpecifications.createdBetween(filter.startDate(), filter.endDate()));
        }

        return orderRepository.findAll(spec, pageable);
    }

    @Transactional
    public Order updateOrderStatus(@NonNull String orderId, @NonNull OrderStatus status) {
        Order order = getOrderById(orderId);

        if (order.getStatus() == OrderStatus.CANCELED) {
            throw new BadRequestException("Cannot update status of canceled order");
        }
        if (order.getStatus() == OrderStatus.CLOSED) {
            throw new BadRequestException("Cannot change status of closed order");
        }
        if (status == OrderStatus.CANCELED
                && order.getStatus() != OrderStatus.PENDING_PAYMENT
                && order.getStatus() != OrderStatus.CONFIRMING_PAYMENT) {
            throw new BadRequestException("Order can only be canceled when pending payment or confirming payment");
        }

        OrderStatus previousStatus = order.getStatus();
        order.setStatus(status);
        if ((status == OrderStatus.CLOSED || status == OrderStatus.CANCELED) && order.getClosedAt() == null) {
            order.setClosedAt(LocalDateTime.now());
        }
        Order savedOrder = orderRepository.save(order);

        if (previousStatus != status) {
            User currentUser = authService.getCurrentUser(false);
            recordStatusChange(orderId, previousStatus, status,
                    currentUser != null ? currentUser.getId() : null);
            try {
                if (status == OrderStatus.CANCELED) {
                    sendOrderCancelEmail(order, true);
                } else {
                    sendOrderStatusUpdateEmail(order, status);
                }
            } catch (Exception e) {
                log.error(
                        "Failed to send order status update email for order: {}. Status update completed successfully.",
                        orderId, e);
            }
        }

        return savedOrder;
    }

    public void sendOrderStatusUpdateEmail(Order order, OrderStatus newStatus) {
        Optional<User> recipient = resolveEmailRecipient(order);
        if (recipient.isEmpty()) {
            return;
        }
        User user = recipient.get();

        NotificationPreferences prefs = userService.getNotificationPreferences(user.getId());
        if (!prefs.isOrderStatus()) {
            log.info("Skipping order status email for order {}: user {} has disabled order status notifications",
                    order.getId(), user.getId());
            return;
        }

        List<OrderProduct> orderProducts = getOrderProducts(order.getId());
        mailService.sendOrderStatusUpdate(
                user.getEmail(),
                user.getName(),
                order.getId(),
                order.getCreatedAt(),
                newStatus,
                buildProductInfos(orderProducts),
                computeTotalPrice(orderProducts));

        log.info("Order status update email sent for order: {} to user: {}", order.getId(), user.getEmail());
    }

    private void sendOrderCancelEmail(Order order, boolean canceledByAdmin) {
        Optional<User> recipient = resolveEmailRecipient(order);
        if (recipient.isEmpty()) {
            return;
        }
        User user = recipient.get();

        NotificationPreferences prefs = userService.getNotificationPreferences(user.getId());
        if (!prefs.isOrderCancelled()) {
            log.info("Skipping order cancellation email for order {}: user {} has disabled cancellation notifications",
                    order.getId(), user.getId());
            return;
        }

        List<OrderProduct> orderProducts = getOrderProducts(order.getId());
        mailService.sendOrderCanceled(
                user.getEmail(),
                user.getName(),
                order.getId(),
                order.getCreatedAt(),
                buildProductInfos(orderProducts),
                computeTotalPrice(orderProducts),
                canceledByAdmin);

        log.info("Order cancellation email sent for order: {} to user: {} (canceledByAdmin: {})",
                order.getId(), user.getEmail(), canceledByAdmin);
    }

    private Optional<User> resolveEmailRecipient(Order order) {
        User user = userRepository.findById(order.getCustomerId()).orElse(null);
        if (user == null) {
            log.warn("Cannot send email notification for order {}: user {} not found",
                    order.getId(), order.getCustomerId());
            return Optional.empty();
        }
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            log.warn("Cannot send email notification for order {}: user {} has no email",
                    order.getId(), order.getCustomerId());
            return Optional.empty();
        }
        return Optional.of(user);
    }

    private List<MailService.OrderProductInfo> buildProductInfos(List<OrderProduct> orderProducts) {
        return orderProducts.stream()
                .map(op -> {
                    Product product = productRepository.findById(op.getProductId()).orElse(null);
                    String productName = product != null ? product.getName() : "Unknown Product";
                    String configuration = productService.formatConfiguration(op.getConfiguration(), product);
                    return new MailService.OrderProductInfo(
                            productName,
                            op.getQuantity(),
                            op.getPrice(),
                            configuration);
                })
                .collect(Collectors.toList());
    }

    private BigDecimal computeTotalPrice(List<OrderProduct> orderProducts) {
        return orderProducts.stream()
                .map(op -> op.getPrice().multiply(new BigDecimal(op.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Transactional
    public Order cancelOrder(@NonNull String orderId, boolean canceledByAdmin) {
        Order order = getOrderById(orderId);

        if (order.getStatus() != OrderStatus.PENDING_PAYMENT
                && order.getStatus() != OrderStatus.CONFIRMING_PAYMENT) {
            throw new BadRequestException("Order can only be canceled when pending payment or confirming payment");
        }

        OrderStatus previousStatus = order.getStatus();
        order.setStatus(OrderStatus.CANCELED);
        order.setClosedAt(LocalDateTime.now());
        Order savedOrder = orderRepository.save(order);

        User currentUser = authService.getCurrentUser(false);
        recordStatusChange(orderId, previousStatus, OrderStatus.CANCELED,
                currentUser != null ? currentUser.getId() : null);

        try {
            sendOrderCancelEmail(order, canceledByAdmin);
        } catch (Exception e) {
            log.error("Failed to send order cancellation email for order: {}. Cancellation completed successfully.",
                    orderId, e);
        }

        return savedOrder;
    }

    @Transactional
    public Order uploadReceipt(@NonNull String orderId, @NonNull String customerId, @NonNull String fileId) {
        Order order = getOrderById(orderId);

        if (!order.getCustomerId().equals(customerId)) {
            throw new BadRequestException("Order does not belong to the specified customer");
        }

        if (order.getStatus() != OrderStatus.PENDING_PAYMENT) {
            throw new BadRequestException("Receipt can only be uploaded when order is pending payment");
        }

        uploadedFileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("Uploaded file not found: " + fileId));

        order.setReceiptFileId(fileId);
        order.setStatus(OrderStatus.CONFIRMING_PAYMENT);
        Order savedOrder = orderRepository.save(order);

        recordStatusChange(orderId, OrderStatus.PENDING_PAYMENT, OrderStatus.CONFIRMING_PAYMENT, customerId);

        try {
            sendOrderStatusUpdateEmail(order, OrderStatus.CONFIRMING_PAYMENT);
        } catch (Exception e) {
            log.error("Failed to send confirming payment email for order: {}. Receipt upload completed successfully.",
                    orderId, e);
        }

        return savedOrder;
    }

    @Transactional
    public Order uploadReceiptAsAdmin(@NonNull String orderId, @NonNull String fileId) {
        Order order = getOrderById(orderId);

        if (order.getStatus() != OrderStatus.PENDING_PAYMENT
                && order.getStatus() != OrderStatus.CONFIRMING_PAYMENT) {
            throw new BadRequestException("Receipt can only be uploaded when order is pending or confirming payment");
        }

        uploadedFileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("Uploaded file not found: " + fileId));

        OrderStatus previousStatus = order.getStatus();
        order.setReceiptFileId(fileId);
        order.setStatus(OrderStatus.CONFIRMING_PAYMENT);
        Order savedOrder = orderRepository.save(order);

        User admin = authService.getCurrentUser(true);
        recordStatusChange(orderId, previousStatus, OrderStatus.CONFIRMING_PAYMENT, admin.getId());

        if (previousStatus == OrderStatus.PENDING_PAYMENT) {
            try {
                sendOrderStatusUpdateEmail(order, OrderStatus.CONFIRMING_PAYMENT);
            } catch (Exception e) {
                log.error("Failed to send confirming payment email for order: {}. Receipt upload completed successfully.",
                        orderId, e);
            }
        }

        return savedOrder;
    }

    @Transactional
    public Order confirmOrderDelivery(@NonNull String orderId,
            @NonNull String currentUserId) {
        Order order = getOrderById(orderId);

        if (!order.getCustomerId().equals(currentUserId)) {
            throw new ForbiddenException("You do not have permission to update this order");
        }

        if (order.getStatus() != OrderStatus.PENDING_PRODUCTS) {
            throw new BadRequestException(
                    "Order can only be confirmed as delivered when in PENDING_PRODUCTS status");
        }

        checkAndCloseOrder(orderId);

        return getOrderById(orderId);
    }

    public List<Order> getOrdersByCustomer(@NonNull String customerId) {
        Specification<Order> spec = OrderSpecifications.customerIdEquals(customerId);
        return orderRepository.findAll(spec);
    }

    public List<OrderProduct> getOrderProducts(@NonNull String orderId) {
        getOrderById(orderId);
        return orderProductRepository.findAll(
                es.yambo_alco.web.repository.spec.OrderProductSpecifications.orderIdEquals(orderId));
    }

    public boolean hasOpenIssues(@NonNull String orderId) {
        return issueRepository.findByOrderId(orderId).stream().anyMatch(this::isOpenIssue);
    }

    @Transactional
    public void deleteOrder(@NonNull String orderId) {
        Order order = getOrderById(orderId);

        if (order.getStatus() == OrderStatus.CLOSED) {
            throw new BadRequestException("Cannot delete closed order");
        }

        // Un pedido con incidencias vinculadas no se puede borrar físicamente:
        // issue.ordered_product_id tiene FK a order_product. El admin debe
        // resolver/eliminar las incidencias primero (o cancelar el pedido).
        if (!issueRepository.findByOrderId(orderId).isEmpty()) {
            throw new BadRequestException("Cannot delete order with linked issues");
        }

        // Delete order products first (cascade should handle this, but being explicit)
        orderProductRepository.deleteByOrderId(orderId);
        orderRepository.delete(order);
    }

    /**
     * Check if an order should be auto-closed.
     * An order is closed when all products are delivered and no ordered product has an open issue.
     */
    public void checkAndCloseOrder(@NonNull String orderId) {
        Order order = getOrderById(orderId);

        if (order.getStatus() == OrderStatus.CLOSED || order.getStatus() == OrderStatus.CANCELED) {
            return;
        }

        if (issueRepository.findByOrderId(orderId).stream().anyMatch(this::isOpenIssue)) {
            return;
        }

        OrderStatus previousStatus = order.getStatus();
        order.setStatus(OrderStatus.CLOSED);
        order.setClosedAt(LocalDateTime.now());
        orderRepository.save(order);

        recordStatusChange(orderId, previousStatus, OrderStatus.CLOSED, null);

        try {
            sendOrderStatusUpdateEmail(order, OrderStatus.CLOSED);
        } catch (Exception e) {
            log.error("Failed to send order closed email for order: {}.", orderId, e);
        }
    }

    /**
     * Update order statuses for orders containing products belonging to a given family product.
     * Called when the family product status changes.
     * Returns a list of pending email notifications to be sent asynchronously.
     */
    @Transactional
    public List<PendingOrderEmail> updateOrderStatusByFamilyProduct(@NonNull String familyProductId,
            @NonNull es.yambo_alco.web.model.enums.FamilyProductStatus newFamilyStatus) {
        List<Product> products = productRepository.findAll(
                (root, query, cb) -> cb.equal(root.get("familyProduct").get("id"), familyProductId));

        Set<String> productIds = products.stream()
                .map(Product::getId)
                .collect(Collectors.toSet());

        if (productIds.isEmpty()) {
            return List.of();
        }

        List<OrderProduct> orderProducts = orderProductRepository.findAll(
                (root, query, cb) -> root.get("productId").in(productIds));

        Set<String> affectedOrderIds = orderProducts.stream()
                .map(OrderProduct::getOrderId)
                .collect(Collectors.toSet());

        List<PendingOrderEmail> pendingEmails = new ArrayList<>();

        // When drop moves to fabrication or beyond, transition orders from PAYMENT_CONFIRMED to PENDING_PRODUCTS
        boolean moveToProduction = newFamilyStatus == es.yambo_alco.web.model.enums.FamilyProductStatus.PENDING_FABRICATION
                || newFamilyStatus == es.yambo_alco.web.model.enums.FamilyProductStatus.TO_BE_DELIVERED
                || newFamilyStatus == es.yambo_alco.web.model.enums.FamilyProductStatus.DELIVERED;

        if (moveToProduction) {
            for (String orderId : affectedOrderIds) {
                Order order = orderRepository.findById(orderId).orElse(null);
                if (order != null && order.getStatus() == OrderStatus.PAYMENT_CONFIRMED) {
                    order.setStatus(OrderStatus.PENDING_PRODUCTS);
                    orderRepository.save(order);
                    recordStatusChange(orderId, OrderStatus.PAYMENT_CONFIRMED, OrderStatus.PENDING_PRODUCTS, null);
                    pendingEmails.add(new PendingOrderEmail(orderId, OrderStatus.PENDING_PRODUCTS));
                }
            }
        }

        // When drop moves to DELIVERED, auto-close any fully-eligible orders
        if (newFamilyStatus == es.yambo_alco.web.model.enums.FamilyProductStatus.DELIVERED) {
            for (String orderId : affectedOrderIds) {
                checkAndCloseOrder(orderId);
            }
        }

        return pendingEmails;
    }

    private boolean isOpenIssue(Issue issue) {
        IssueStatus status = issue.getStatus();
        return status == IssueStatus.OPEN || status == IssueStatus.IN_PROGRESS;
    }

    public record PendingOrderEmail(String orderId, OrderStatus newStatus) {}

    private void recordStatusChange(String orderId, OrderStatus fromStatus, OrderStatus toStatus, String changedBy) {
        try {
            OrderStatusHistory history = OrderStatusHistory.builder()
                    .orderId(orderId)
                    .fromStatus(fromStatus)
                    .toStatus(toStatus)
                    .changedAt(LocalDateTime.now())
                    .changedBy(changedBy)
                    .build();
            orderStatusHistoryRepository.save(history);
        } catch (Exception e) {
            log.error("Failed to record status change for order: {}", orderId, e);
        }
    }
}
