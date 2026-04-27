package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ForbiddenException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.*;
import es.yambo_alco.web.model.enums.IssueStatus;
import es.yambo_alco.web.model.enums.OrderProductStatus;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
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
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

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

    @Lazy
    @Autowired
    private OrderService self;

    @Transactional
    public Order createOrder(@NonNull String customerId, @NonNull List<OrderProduct> orderProducts) {
        if (orderProducts.isEmpty()) {
            throw new BadRequestException("Order must contain at least one product");
        }

        User currentUser = authService.getCurrentUser(true);
        LocalDateTime now = LocalDateTime.now();

        for (OrderProduct op : orderProducts) {
            Product product = productRepository.findById(op.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + op.getProductId()));

            validateProductAccess(currentUser, product, now);

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
            op.setStatus(OrderProductStatus.OPEN);
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

    private BigDecimal calculatePrice(Product product, String configurationJson) {
        BigDecimal totalPrice = product.getBasePrice();

        if (configurationJson == null || configurationJson.trim().isEmpty()) {
            return totalPrice;
        }

        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            @SuppressWarnings("unchecked")
            java.util.Map<String, Object> configuration = mapper.readValue(configurationJson, java.util.Map.class);

            List<ProductOption> options = product.getOptions();
            if (options == null || options.isEmpty()) {
                return totalPrice;
            }

            for (ProductOption option : options) {
                Object selectedValue = configuration.get(option.getName());
                if (selectedValue == null) {
                    continue;
                }

                if (option.getPrice() != null) {
                    totalPrice = totalPrice.add(option.getPrice());
                }

                if ("select".equals(option.getType()) && option.getValues() != null) {
                    String selectedValueStr = selectedValue.toString();
                    for (OptionValue value : option.getValues()) {
                        if (value.getLabel().equals(selectedValueStr) || value.getId().equals(selectedValueStr)) {
                            if (value.getPrice() != null) {
                                totalPrice = totalPrice.add(value.getPrice());
                            }
                            break;
                        }
                    }
                }
            }
        } catch (Exception e) {
            // If parsing fails, just return base price
            return totalPrice;
        }

        return totalPrice;
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

        if (family.getProfile() != null) {
            boolean hasProfile = user.getProfiles().stream()
                    .anyMatch(p -> p.getId().equals(family.getProfile().getId()));

            if (!hasProfile) {
                throw new BadRequestException(
                        String.format("You don't have access to product '%s'. Required profile: %s",
                                product.getName(), family.getProfile().getName()));
            }
        }
    }

    public Order getOrderById(@NonNull String orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
    }

    public Page<Order> listOrders(String orderId, String customerName, String customerId, List<OrderStatus> statuses,
            LocalDateTime startDate, LocalDateTime endDate,
            @NonNull Pageable pageable) {
        Specification<Order> spec = Specification.where(null);

        if (orderId != null) {
            spec = spec.and(OrderSpecifications.idContains(orderId));
        }
        if (customerName != null) {
            spec = spec.and(OrderSpecifications.customerNameContains(customerName));
        }
        if (customerId != null) {
            spec = spec.and(OrderSpecifications.customerIdEquals(customerId));
        }
        if (statuses != null && !statuses.isEmpty()) {
            spec = spec.and(OrderSpecifications.statusIn(statuses));
        }
        if (startDate != null || endDate != null) {
            spec = spec.and(OrderSpecifications.createdBetween(startDate, endDate));
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
        User user = userRepository.findById(order.getCustomerId())
                .orElse(null);

        if (user == null) {
            log.warn("Cannot send email notification for order {}: user {} not found", order.getId(),
                    order.getCustomerId());
            return;
        }

        if (user.getEmail() == null || user.getEmail().isBlank()) {
            log.warn("Cannot send email notification for order {}: user {} has no email", order.getId(),
                    order.getCustomerId());
            return;
        }

        NotificationPreferences prefs = userService.getNotificationPreferences(user.getId());
        if (!prefs.isOrderStatus()) {
            log.info("Skipping order status email for order {}: user {} has disabled order status notifications",
                    order.getId(), user.getId());
            return;
        }

        List<OrderProduct> orderProducts = getOrderProducts(order.getId());
        List<MailService.OrderProductInfo> productInfos = orderProducts.stream()
                .map(op -> {
                    Product product = productRepository.findById(op.getProductId()).orElse(null);
                    String productName = product != null ? product.getName() : "Unknown Product";
                    String configuration = formatConfiguration(op.getConfiguration(), product);
                    return new MailService.OrderProductInfo(
                            productName,
                            op.getQuantity(),
                            op.getPrice(),
                            configuration);
                })
                .collect(Collectors.toList());

        BigDecimal totalPrice = orderProducts.stream()
                .map(op -> op.getPrice().multiply(new BigDecimal(op.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        mailService.sendOrderStatusUpdate(
                user.getEmail(),
                user.getName(),
                order.getId(),
                order.getCreatedAt(),
                newStatus,
                productInfos,
                totalPrice);

        log.info("Order status update email sent for order: {} to user: {}", order.getId(), user.getEmail());
    }

    private void sendOrderCancelEmail(Order order, boolean canceledByAdmin) {
        User user = userRepository.findById(order.getCustomerId())
                .orElse(null);

        if (user == null) {
            log.warn("Cannot send cancellation email for order {}: user {} not found", order.getId(),
                    order.getCustomerId());
            return;
        }

        if (user.getEmail() == null || user.getEmail().isBlank()) {
            log.warn("Cannot send cancellation email for order {}: user {} has no email", order.getId(),
                    order.getCustomerId());
            return;
        }

        NotificationPreferences prefs = userService.getNotificationPreferences(user.getId());
        if (!prefs.isOrderCancelled()) {
            log.info("Skipping order cancellation email for order {}: user {} has disabled cancellation notifications",
                    order.getId(), user.getId());
            return;
        }

        List<OrderProduct> orderProducts = getOrderProducts(order.getId());
        List<MailService.OrderProductInfo> productInfos = orderProducts.stream()
                .map(op -> {
                    Product product = productRepository.findById(op.getProductId()).orElse(null);
                    String productName = product != null ? product.getName() : "Unknown Product";
                    String configuration = formatConfiguration(op.getConfiguration(), product);
                    return new MailService.OrderProductInfo(
                            productName,
                            op.getQuantity(),
                            op.getPrice(),
                            configuration);
                })
                .collect(Collectors.toList());

        BigDecimal totalPrice = orderProducts.stream()
                .map(op -> op.getPrice().multiply(new BigDecimal(op.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        mailService.sendOrderCanceled(
                user.getEmail(),
                user.getName(),
                order.getId(),
                order.getCreatedAt(),
                productInfos,
                totalPrice,
                canceledByAdmin);

        log.info("Order cancellation email sent for order: {} to user: {} (canceledByAdmin: {})",
                order.getId(), user.getEmail(), canceledByAdmin);
    }

    private String formatConfiguration(String configurationJson, Product product) {
        if (configurationJson == null || configurationJson.trim().isEmpty() || configurationJson.equals("{}")) {
            return null;
        }

        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            @SuppressWarnings("unchecked")
            java.util.Map<String, Object> config = mapper.readValue(configurationJson, java.util.Map.class);

            if (config.isEmpty() || product == null || product.getOptions() == null) {
                return null;
            }

            String formatted = config.entrySet().stream()
                    .filter(entry -> entry.getValue() != null)
                    .filter(entry -> !(entry.getValue() instanceof String) || !((String) entry.getValue()).isBlank())
                    .filter(entry -> isValidOption(entry.getKey(), entry.getValue(), product.getOptions()))
                    .map(entry -> formatOptionValue(entry.getKey(), entry.getValue(), product.getOptions()))
                    .collect(Collectors.joining(", "));

            return formatted.isEmpty() ? null : formatted;
        } catch (Exception e) {
            // If parsing fails, return raw JSON
            return configurationJson;
        }
    }

    private boolean isValidOption(String optionName, Object value, List<ProductOption> options) {
        ProductOption option = options.stream()
                .filter(opt -> opt.getName().equals(optionName))
                .findFirst()
                .orElse(null);

        if (option == null) {
            return false; // Option doesn't exist in product
        }

        if ("select".equals(option.getType()) && option.getValues() != null) {
            String valueStr = value.toString();
            return option.getValues().stream()
                    .anyMatch(v -> v.getId().equals(valueStr) || v.getLabel().equals(valueStr));
        }

        // For other types (checkbox, text_input), just check it exists
        return true;
    }

    private String formatOptionValue(String optionName, Object value, List<ProductOption> options) {
        ProductOption option = options.stream()
                .filter(opt -> opt.getName().equals(optionName))
                .findFirst()
                .orElse(null);

        if (option == null) {
            return optionName + ": " + value;
        }

        if ("select".equals(option.getType()) && option.getValues() != null) {
            String valueStr = value.toString();
            OptionValue optionValue = option.getValues().stream()
                    .filter(v -> v.getId().equals(valueStr) || v.getLabel().equals(valueStr))
                    .findFirst()
                    .orElse(null);

            if (optionValue != null) {
                return optionName + ": " + optionValue.getLabel();
            }
        }

        return optionName + ": " + value;
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
    public Order confirmOrderProductDelivery(@NonNull String orderId, @NonNull String orderProductId,
            @NonNull String currentUserId) {
        Order order = getOrderById(orderId);

        if (!order.getCustomerId().equals(currentUserId)) {
            throw new ForbiddenException("You do not have permission to update this order");
        }

        OrderProduct orderProduct = orderProductRepository.findById(UUID.fromString(orderProductId))
                .orElseThrow(() -> new ResourceNotFoundException("Order product not found: " + orderProductId));

        if (!orderProduct.getOrderId().equals(orderId)) {
            throw new ResourceNotFoundException("Order product not found: " + orderProductId);
        }

        if (orderProduct.getStatus() != OrderProductStatus.TO_BE_DELIVERED) {
            throw new BadRequestException(
                    "Order product can only be confirmed as delivered when in TO_BE_DELIVERED status");
        }

        orderProduct.setStatus(OrderProductStatus.DELIVERED);
        orderProductRepository.save(orderProduct);

        self.checkAndCloseOrder(orderId);

        return getOrderById(orderId);
    }

    public List<Order> getOrdersByCustomer(@NonNull String customerId) {        Specification<Order> spec = OrderSpecifications.customerIdEquals(customerId);
        return orderRepository.findAll(spec);
    }

    public List<OrderProduct> getOrderProducts(@NonNull String orderId) {
        getOrderById(orderId);
        return orderProductRepository.findAll(
                es.yambo_alco.web.repository.spec.OrderProductSpecifications.orderIdEquals(orderId));
    }

    public boolean hasOpenIssues(@NonNull String orderId) {
        List<Issue> issues = issueRepository.findByOrderId(orderId);
        return issues.stream().anyMatch(issue -> {
            IssueStatus is = issue.getStatus();
            return is == IssueStatus.OPEN || is == IssueStatus.IN_PROGRESS || is == IssueStatus.REOPENED;
        });
    }

    @Transactional
    public void deleteOrder(@NonNull String orderId) {
        Order order = getOrderById(orderId);

        if (order.getStatus() == OrderStatus.CLOSED) {
            throw new BadRequestException("Cannot delete closed order");
        }

        // Delete order products first (cascade should handle this, but being explicit)
        orderProductRepository.deleteByOrderId(orderId);
        orderRepository.delete(order);
    }

    /**
     * Check if an order should be auto-closed.
     * An order is closed when all products are delivered and no ordered product has an open issue.
     */
    @Transactional
    public void checkAndCloseOrder(@NonNull String orderId) {
        Order order = getOrderById(orderId);

        if (order.getStatus() == OrderStatus.CLOSED || order.getStatus() == OrderStatus.CANCELED) {
            return;
        }

        List<OrderProduct> orderProducts = getOrderProducts(orderId);
        if (orderProducts.isEmpty()) {
            return;
        }

        boolean allDelivered = orderProducts.stream()
                .allMatch(op -> op.getStatus() == OrderProductStatus.DELIVERED);

        if (!allDelivered) {
            return;
        }

        // Check no open issues exist for any order product
        List<Issue> issues = issueRepository.findByOrderId(orderId);
        boolean hasOpenIssues = issues.stream()
                .anyMatch(issue -> {
                    IssueStatus is = issue.getStatus();
                    return is == IssueStatus.OPEN || is == IssueStatus.IN_PROGRESS || is == IssueStatus.REOPENED;
                });

        if (hasOpenIssues) {
            return;
        }

        order.setStatus(OrderStatus.CLOSED);
        order.setClosedAt(LocalDateTime.now());
        orderRepository.save(order);

        recordStatusChange(orderId, OrderStatus.PENDING_PRODUCTS, OrderStatus.CLOSED, null);

        try {
            sendOrderStatusUpdateEmail(order, OrderStatus.CLOSED);
        } catch (Exception e) {
            log.error("Failed to send order closed email for order: {}.", orderId, e);
        }
    }

    /**
     * Update all order product statuses for products belonging to a given family product.
     * Called when the family product status changes.
     * Returns a list of pending email notifications to be sent asynchronously.
     */
    @Transactional
    public List<PendingOrderEmail> updateOrderProductStatusByFamilyProduct(@NonNull String familyProductId,
            @NonNull OrderProductStatus newStatus) {
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

        Set<String> affectedOrderIds = new java.util.HashSet<>();

        for (OrderProduct op : orderProducts) {
            // Don't update canceled order products
            if (op.getStatus() == OrderProductStatus.CANCELED) {
                continue;
            }
            op.setStatus(newStatus);
            orderProductRepository.save(op);
            affectedOrderIds.add(op.getOrderId());
        }

        List<PendingOrderEmail> pendingEmails = new ArrayList<>();

        // When drop moves to fabrication or beyond, transition orders from PAYMENT_CONFIRMED to PENDING_PRODUCTS
        if (newStatus == OrderProductStatus.PENDING_FABRICATION
                || newStatus == OrderProductStatus.TO_BE_DELIVERED
                || newStatus == OrderProductStatus.DELIVERED) {
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

        // Check if any affected orders should be auto-closed
        if (newStatus == OrderProductStatus.DELIVERED) {
            for (String orderId : affectedOrderIds) {
                Order order = getOrderById(orderId);
                if (order.getStatus() == OrderStatus.CLOSED || order.getStatus() == OrderStatus.CANCELED) {
                    continue;
                }
                List<OrderProduct> ops = getOrderProducts(orderId);
                if (ops.isEmpty()) continue;
                boolean allDelivered = ops.stream()
                        .allMatch(op -> op.getStatus() == OrderProductStatus.DELIVERED);
                if (!allDelivered) continue;
                List<Issue> issues = issueRepository.findByOrderId(orderId);
                boolean hasOpenIssues = issues.stream()
                        .anyMatch(issue -> {
                            IssueStatus is = issue.getStatus();
                            return is == IssueStatus.OPEN || is == IssueStatus.IN_PROGRESS || is == IssueStatus.REOPENED;
                        });
                if (hasOpenIssues) continue;

                order.setStatus(OrderStatus.CLOSED);
                order.setClosedAt(LocalDateTime.now());
                orderRepository.save(order);
                recordStatusChange(orderId, OrderStatus.PENDING_PRODUCTS, OrderStatus.CLOSED, null);
                pendingEmails.add(new PendingOrderEmail(orderId, OrderStatus.CLOSED));
            }
        }

        return pendingEmails;
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
