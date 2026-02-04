package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.*;
import es.yambo_alco.web.model.enums.OrderStatus;
import es.yambo_alco.web.repository.OrderProductRepository;
import es.yambo_alco.web.repository.OrderRepository;
import es.yambo_alco.web.repository.ProductRepository;
import es.yambo_alco.web.repository.spec.OrderSpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderProductRepository orderProductRepository;
    private final ProductRepository productRepository;
    private final AuthService authService;

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
                    product.getName(), family.getStartTms())
            );
        }
        if (now.isAfter(family.getEndTms())) {
            throw new BadRequestException(
                String.format("Product '%s' is no longer available. Expired on: %s", 
                    product.getName(), family.getEndTms())
            );
        }

        // Check if user has required profile
        if (family.getProfile() != null) {
            boolean hasProfile = user.getProfiles().stream()
                    .anyMatch(p -> p.getId().equals(family.getProfile().getId()));
            
            if (!hasProfile) {
                throw new BadRequestException(
                    String.format("You don't have access to product '%s'. Required profile: %s", 
                        product.getName(), family.getProfile().getName())
                );
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

        order.setStatus(status);
        return orderRepository.save(order);
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
            es.yambo_alco.web.repository.spec.OrderProductSpecifications.orderIdEquals(orderId)
        );
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
