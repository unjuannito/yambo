package es.yambo_alco.web.controller;

import es.yambo_alco.web.exception.ForbiddenException;
import es.yambo_alco.web.model.Order;
import es.yambo_alco.web.model.OrderProduct;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.OrderProductStatus;
import es.yambo_alco.web.model.enums.OrderStatus;
import es.yambo_alco.web.repository.ProductRepository;
import es.yambo_alco.web.repository.UserRepository;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.OrderService;
import es.yambo_alco.web.util.PermissionCheckService;
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
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final PermissionCheckService permissionCheck;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody CreateOrderRequest request) {
        User currentUser = authService.getCurrentUser(true);
        List<OrderProduct> orderProducts = request.getProducts().stream()
                .map(p -> OrderProduct.builder()
                        .productId(p.getProductId())
                        .quantity(p.getQuantity())
                        .price(BigDecimal.ZERO) // Price will be calculated by service
                        .configuration(p.getConfiguration() != null && !p.getConfiguration().trim().isEmpty()
                                ? p.getConfiguration()
                                : null)
                        .build())
                .collect(Collectors.toList());

        Order order = orderService.createOrder(currentUser.getId(), orderProducts);
        List<OrderProduct> products = orderService.getOrderProducts(order.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new OrderResponse(order, products, userRepository, productRepository, orderService));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<OrderResponse>> listOrders(
            @RequestParam(required = false) String customerId,
            @RequestParam(required = false) List<OrderStatus> status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            Pageable pageable) {
        Page<Order> orders = orderService.listOrders(customerId, status, startDate, endDate, pageable);
        Page<OrderResponse> response = orders.map(order -> {
            List<OrderProduct> products = orderService.getOrderProducts(order.getId());
            return new OrderResponse(order, products, userRepository, productRepository, orderService);
        });
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable String id) {
        Order order = orderService.getOrderById(id);
        List<OrderProduct> products = orderService.getOrderProducts(id);
        return ResponseEntity.ok(new OrderResponse(order, products, userRepository, productRepository, orderService));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("@permissionCheck.hasPermission('order', 'update')")
    public ResponseEntity<OrderResponse> updateOrderStatus(
            @PathVariable String id,
            @Valid @RequestBody UpdateOrderStatusRequest request) {
        Order order = orderService.updateOrderStatus(id, request.getStatus());
        List<OrderProduct> products = orderService.getOrderProducts(id);
        return ResponseEntity.ok(new OrderResponse(order, products, userRepository, productRepository, orderService));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('order', 'delete')")
    public ResponseEntity<Void> cancelOrder(@PathVariable String id) {
        orderService.cancelOrder(id, true);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<OrderResponse>> getMyOrders(
            @RequestParam(required = false) List<OrderStatus> status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            Pageable pageable) {
        User user = authService.getCurrentUser(true);

        Page<Order> orders = orderService.listOrders(user.getId(), status, startDate, endDate, pageable);
        Page<OrderResponse> response = orders.map(order -> {
            List<OrderProduct> products = orderService.getOrderProducts(order.getId());
            return new OrderResponse(order, products, userRepository, productRepository, orderService);
        });
        return ResponseEntity.ok(response);
    }

    @PutMapping("/my/{id}/cancel")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<OrderResponse> cancelMyOrder(@PathVariable String id) {
        User user = authService.getCurrentUser(true);
        Order order = orderService.getOrderById(id);

        boolean isOwner = order.getCustomerId().equals(user.getId());

        if (!isOwner) {
            throw new ForbiddenException("You do not have permission to cancel this order");
        }

        Order canceledOrder = orderService.cancelOrder(id, false);
        List<OrderProduct> products = orderService.getOrderProducts(id);
        return ResponseEntity.ok(new OrderResponse(canceledOrder, products, userRepository, productRepository, orderService));
    }

    @PutMapping("/my/{id}/receipt")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<OrderResponse> uploadReceipt(
            @PathVariable String id,
            @Valid @RequestBody UploadReceiptRequest request) {
        User user = authService.getCurrentUser(true);
        Order order = orderService.uploadReceipt(id, user.getId(), request.getFileId());
        List<OrderProduct> products = orderService.getOrderProducts(id);
        return ResponseEntity.ok(new OrderResponse(order, products, userRepository, productRepository, orderService));
    }

    @PutMapping("/{id}/receipt")
    @PreAuthorize("@permissionCheck.hasPermission('order', 'update')")
    public ResponseEntity<OrderResponse> adminUploadReceipt(
            @PathVariable String id,
            @Valid @RequestBody UploadReceiptRequest request) {
        Order order = orderService.uploadReceiptAsAdmin(id, request.getFileId());
        List<OrderProduct> products = orderService.getOrderProducts(id);
        return ResponseEntity.ok(new OrderResponse(order, products, userRepository, productRepository, orderService));
    }

    @Data
    public static class CreateOrderRequest {
        @NotEmpty(message = "Order must contain at least one product")
        private List<OrderProductRequest> products;
    }

    @Data
    public static class OrderProductRequest {
        @NotNull(message = "Product ID is required")
        private String productId;

        @NotNull(message = "Quantity is required")
        private Integer quantity;

        private String configuration;
    }

    @Data
    public static class UpdateOrderStatusRequest {
        @NotNull(message = "Status is required")
        private OrderStatus status;
    }

    @Data
    public static class UploadReceiptRequest {
        @NotNull(message = "File ID is required")
        private String fileId;
    }

    @Data
    public static class OrderResponse {
        private String id;
        private UserInfo user;
        private OrderStatus status;
        private LocalDateTime createdAt;
        private LocalDateTime closedAt;
        private boolean hasOpenIssues;
        private String receiptFileId;
        private List<OrderProductResponse> products;

        public OrderResponse(Order order, List<OrderProduct> products, UserRepository userRepository,
                ProductRepository productRepository, OrderService orderService) {
            this.id = order.getId();
            this.status = order.getStatus();
            this.createdAt = order.getCreatedAt();
            this.closedAt = order.getClosedAt();
            this.hasOpenIssues = orderService.hasOpenIssues(order.getId());
            this.receiptFileId = order.getReceiptFileId();

            userRepository.findById(order.getCustomerId()).ifPresent(user -> {
                this.user = new UserInfo(user.getId(), user.getName(), user.getEmail());
            });

            this.products = products.stream()
                    .map(p -> new OrderProductResponse(p, productRepository))
                    .collect(Collectors.toList());
        }
    }

    @Data
    public static class UserInfo {
        private String id;
        private String name;
        private String email;

        public UserInfo(String id, String name, String email) {
            this.id = id;
            this.name = name;
            this.email = email;
        }
    }

    @Data
    public static class OrderProductResponse {
        private String id;
        private String productId;
        private String productName;
        private Integer quantity;
        private BigDecimal price;
        private String configuration;
        private OrderProductStatus status;

        public OrderProductResponse(OrderProduct orderProduct, ProductRepository productRepository) {
            this.id = orderProduct.getId() != null ? orderProduct.getId().toString() : null;
            this.productId = orderProduct.getProductId();
            this.quantity = orderProduct.getQuantity();
            this.price = orderProduct.getPrice();
            this.configuration = orderProduct.getConfiguration();
            this.status = orderProduct.getStatus();

            productRepository.findById(orderProduct.getProductId()).ifPresent(product -> {
                this.productName = product.getName();
            });
        }
    }
}
