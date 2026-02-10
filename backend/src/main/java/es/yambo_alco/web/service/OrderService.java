package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.*;
import es.yambo_alco.web.model.enums.OrderStatus;
import es.yambo_alco.web.repository.OrderProductRepository;
import es.yambo_alco.web.repository.OrderRepository;
import es.yambo_alco.web.repository.ProductRepository;
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
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private final OrderRepository orderRepository;
    private final OrderProductRepository orderProductRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final AuthService authService;
    private final MailService mailService;

    @Transactional
    public Order createOrder(@NonNull String customerId, @NonNull List<OrderProduct> orderProducts) {
        if (orderProducts.isEmpty()) {
            throw new BadRequestException("Order must contain at least one product");
        }

        // Get current user for validation
        User currentUser = authService.getCurrentUser(true);
        LocalDateTime now = LocalDateTime.now();

        // Validate all products exist, calculate prices, and check user access
        for (OrderProduct op : orderProducts) {
            Product product = productRepository.findById(op.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + op.getProductId()));

            validateProductAccess(currentUser, product, now);

            // Calculate the actual price based on product options and configuration
            BigDecimal calculatedPrice = calculatePrice(product, op.getConfiguration());
            op.setPrice(calculatedPrice);
        }

        Order order = Order.builder()
                .customerId(customerId)
                .status(OrderStatus.PENDING_CONFIRMATION)
                .createdAt(now)
                .build();

        order = orderRepository.save(order);

        // Save order products
        for (OrderProduct op : orderProducts) {
            op.setOrderId(order.getId());
            orderProductRepository.save(op);
        }

        // Send email notification for new order (don't fail the order creation if email fails)
        try {
            sendOrderStatusUpdateEmail(order, OrderStatus.PENDING_CONFIRMATION);
        } catch (Exception e) {
            log.error("Failed to send order creation email for order: {}. Order created successfully.", order.getId(), e);
        }

        return order;
    }

    private BigDecimal calculatePrice(Product product, String configurationJson) {
        BigDecimal totalPrice = product.getBasePrice();

        if (configurationJson == null || configurationJson.trim().isEmpty()) {
            return totalPrice;
        }

        try {
            // Parse configuration JSON
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            @SuppressWarnings("unchecked")
            java.util.Map<String, Object> configuration = mapper.readValue(configurationJson, java.util.Map.class);

            // Get product options
            List<ProductOption> options = product.getOptions();
            if (options == null || options.isEmpty()) {
                return totalPrice;
            }

            // Calculate price based on selected options
            for (ProductOption option : options) {
                Object selectedValue = configuration.get(option.getName());
                if (selectedValue == null) {
                    continue;
                }

                // Add option base price if exists
                if (option.getPrice() != null) {
                    totalPrice = totalPrice.add(option.getPrice());
                }

                // For select type, add the price of the selected value
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

        // Check if family is currently valid (within time range)
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

        // Check if user has required profile
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

    public Page<Order> listOrders(String customerId, OrderStatus status,
            LocalDateTime startDate, LocalDateTime endDate,
            @NonNull Pageable pageable) {
        Specification<Order> spec = Specification.where(null);

        if (customerId != null) {
            spec = spec.and(OrderSpecifications.customerIdEquals(customerId));
        }
        if (status != null) {
            spec = spec.and(OrderSpecifications.statusEquals(status));
        }
        if (startDate != null || endDate != null) {
            spec = spec.and(OrderSpecifications.createdBetween(startDate, endDate));
        }

        return orderRepository.findAll(spec, pageable);
    }

    @Transactional
    public Order updateOrderStatus(@NonNull String orderId, @NonNull OrderStatus status) {
        Order order = getOrderById(orderId);

        // Validate status transition
        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new BadRequestException("Cannot update status of cancelled order");
        }
        if (order.getStatus() == OrderStatus.DELIVERED && status != OrderStatus.DELIVERED) {
            throw new BadRequestException("Cannot change status of delivered order");
        }

        OrderStatus previousStatus = order.getStatus();
        order.setStatus(status);
        Order savedOrder = orderRepository.save(order);

        // Send email notification if status changed (don't fail the update if email fails)
        if (previousStatus != status) {
            try {
                sendOrderStatusUpdateEmail(order, status);
            } catch (Exception e) {
                log.error("Failed to send order status update email for order: {}. Status update completed successfully.", orderId, e);
            }
        }

        return savedOrder;
    }

    private void sendOrderStatusUpdateEmail(Order order, OrderStatus newStatus) {
        // Get user details
        User user = userRepository.findById(order.getCustomerId())
                .orElse(null);

        if (user == null) {
            log.warn("Cannot send email notification for order {}: user {} not found", order.getId(), order.getCustomerId());
            return;
        }

        if (user.getEmail() == null || user.getEmail().isBlank()) {
            log.warn("Cannot send email notification for order {}: user {} has no email", order.getId(), order.getCustomerId());
            return;
        }

        // Get order products with details
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
                            configuration
                    );
                })
                .collect(Collectors.toList());

        // Calculate total price
        BigDecimal totalPrice = orderProducts.stream()
                .map(op -> op.getPrice().multiply(new BigDecimal(op.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Send email notification
        mailService.sendOrderStatusUpdate(
                user.getEmail(),
                user.getName(),
                order.getId(),
                order.getCreatedAt(),
                newStatus,
                productInfos,
                totalPrice
        );

        log.info("Order status update email sent for order: {} to user: {}", order.getId(), user.getEmail());
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

        // For select type, validate the value is one of the valid options
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

        // For select type, try to get the label instead of the id
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
    public Order cancelOrder(@NonNull String orderId) {
        Order order = getOrderById(orderId);

        if (order.getStatus() == OrderStatus.DELIVERED) {
            throw new BadRequestException("Cannot cancel delivered order");
        }
        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new BadRequestException("Order is already cancelled");
        }

        order.setStatus(OrderStatus.CANCELLED);
        return orderRepository.save(order);
    }

    public List<Order> getOrdersByCustomer(@NonNull String customerId) {
        Specification<Order> spec = OrderSpecifications.customerIdEquals(customerId);
        return orderRepository.findAll(spec);
    }

    public List<OrderProduct> getOrderProducts(@NonNull String orderId) {
        // Verify order exists
        getOrderById(orderId);
        return orderProductRepository.findAll(
                es.yambo_alco.web.repository.spec.OrderProductSpecifications.orderIdEquals(orderId));
    }

    @Transactional
    public void deleteOrder(@NonNull String orderId) {
        Order order = getOrderById(orderId);

        if (order.getStatus() == OrderStatus.DELIVERED) {
            throw new BadRequestException("Cannot delete delivered order");
        }

        // Delete order products first (cascade should handle this, but being explicit)
        orderProductRepository.deleteByOrderId(orderId);
        orderRepository.delete(order);
    }
}
