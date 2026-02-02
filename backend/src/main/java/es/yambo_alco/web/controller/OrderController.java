package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.Order;
import es.yambo_alco.web.model.OrderProduct;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.OrderStatus;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.OrderService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final AuthService authService;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody CreateOrderRequest request) {
        List<OrderProduct> orderProducts = request.getProducts().stream()
                .map(p -> OrderProduct.builder()
                        .productId(p.getProductId())
                        .quantity(p.getQuantity())
                        .price(p.getPrice())
                        .configuration(p.getConfiguration() != null ? p.getConfiguration() : "{}")
                        .build())
                .collect(Collectors.toList());

        Order order = orderService.createOrder(request.getCustomerId(), orderProducts);
        List<OrderProduct> products = orderService.getOrderProducts(order.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(new OrderResponse(order, products));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<OrderResponse>> listOrders(
            @RequestParam(required = false) Integer customerId,
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            Pageable pageable) {
        Page<Order> orders = orderService.listOrders(customerId, status, startDate, endDate, pageable);
        Page<OrderResponse> response = orders.map(order -> {
            List<OrderProduct> products = orderService.getOrderProducts(order.getId());
            return new OrderResponse(order, products);
        });
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable String id) {
        Order order = orderService.getOrderById(id);
        List<OrderProduct> products = orderService.getOrderProducts(id);
        return ResponseEntity.ok(new OrderResponse(order, products));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("@permissionCheck.hasPermission('order', 'update')")
    public ResponseEntity<OrderResponse> updateOrderStatus(
            @PathVariable String id,
            @Valid @RequestBody UpdateOrderStatusRequest request) {
        Order order = orderService.updateOrderStatus(id, request.getStatus());
        List<OrderProduct> products = orderService.getOrderProducts(id);
        return ResponseEntity.ok(new OrderResponse(order, products));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('order', 'delete')")
    public ResponseEntity<Void> cancelOrder(@PathVariable String id) {
        orderService.cancelOrder(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<OrderResponse>> getMyOrders() {
        User user = authService.getCurrentUser(true);
        // Assuming user ID can be used as customerId or there's a mapping
        // For now, we'll use a placeholder - needs proper implementation
        List<Order> orders = orderService.getOrdersByCustomer(Integer.parseInt(user.getId(), 16));
        List<OrderResponse> response = orders.stream()
                .map(order -> {
                    List<OrderProduct> products = orderService.getOrderProducts(order.getId());
                    return new OrderResponse(order, products);
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @Data
    public static class CreateOrderRequest {
        @NotNull(message = "Customer ID is required")
        private Integer customerId;

        @NotEmpty(message = "Order must contain at least one product")
        private List<OrderProductRequest> products;
    }

    @Data
    public static class OrderProductRequest {
        @NotNull(message = "Product ID is required")
        private String productId;

        @NotNull(message = "Quantity is required")
        private Integer quantity;

        @NotNull(message = "Price is required")
        private BigDecimal price;

        private String configuration;
    }

    @Data
    public static class UpdateOrderStatusRequest {
        @NotNull(message = "Status is required")
        private OrderStatus status;
    }

    @Data
    public static class OrderResponse {
        private String id;
        private Integer customerId;
        private OrderStatus status;
        private Integer paymentId;
        private LocalDateTime createdAt;
        private List<OrderProductResponse> products;

        public OrderResponse(Order order, List<OrderProduct> products) {
            this.id = order.getId();
            this.customerId = order.getCustomerId();
            this.status = order.getStatus();
            this.paymentId = order.getPaymentId();
            this.createdAt = order.getCreatedAt();
            this.products = products.stream()
                    .map(OrderProductResponse::new)
                    .collect(Collectors.toList());
        }
    }

    @Data
    public static class OrderProductResponse {
        private String productId;
        private Integer quantity;
        private BigDecimal price;
        private String configuration;

        public OrderProductResponse(OrderProduct orderProduct) {
            this.productId = orderProduct.getProductId();
            this.quantity = orderProduct.getQuantity();
            this.price = orderProduct.getPrice();
            this.configuration = orderProduct.getConfiguration();
        }
    }
}
