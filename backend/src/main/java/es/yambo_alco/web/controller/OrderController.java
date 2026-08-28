package es.yambo_alco.web.controller;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ForbiddenException;
import es.yambo_alco.web.model.Order;
import es.yambo_alco.web.model.OrderChange;
import es.yambo_alco.web.model.OrderFilter;
import es.yambo_alco.web.model.OrderProduct;
import es.yambo_alco.web.model.OrderProductOperation;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.OrderStatus;
import es.yambo_alco.web.repository.ProductRepository;
import es.yambo_alco.web.repository.UserRepository;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.OrderChangeService;
import es.yambo_alco.web.service.OrderExportService;
import es.yambo_alco.web.service.export.ExportReportType;
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
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final OrderExportService orderExportService;
    private final AuthService authService;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final PermissionCheckService permissionCheck;
    private final OrderChangeService orderChangeService;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody CreateOrderRequest request) {
        User currentUser = authService.getCurrentUser(true);
        List<OrderProduct> orderProducts = toOrderProducts(request.getProducts());

        String customerId = currentUser.getId();
        if (request.getUserId() != null && !request.getUserId().isBlank()) {
            // Un admin puede crear pedidos en nombre de un socio
            if (!permissionCheck.hasPermission("order", "create")) {
                throw new ForbiddenException("You do not have permission to create orders for other users");
            }
            customerId = request.getUserId();
            if (request.getJustification() == null || request.getJustification().isBlank()) {
                throw new BadRequestException("Justification is required when creating an order for another user");
            }
            Order order = orderService.createOrderWithJustification(customerId, orderProducts,
                    request.getJustification(), currentUser.getId());
            List<OrderProduct> products = orderService.getOrderProducts(order.getId());
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(new OrderResponse(order, products, userRepository, productRepository, orderService));
        }

        Order order = orderService.createOrder(customerId, orderProducts);
        List<OrderProduct> products = orderService.getOrderProducts(order.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new OrderResponse(order, products, userRepository, productRepository, orderService));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('order', 'update')")
    public ResponseEntity<OrderResponse> updateOrder(
            @PathVariable String id,
            @Valid @RequestBody CreateOrderRequest request) {
        User currentUser = authService.getCurrentUser(true);
        if (request.getJustification() == null || request.getJustification().isBlank()) {
            throw new BadRequestException("Justification is required when editing an order");
        }

        Order order;
        List<OrderProductOperation> operations = toOperations(request.getProducts());
        if (request.getIssueId() != null && !request.getIssueId().isBlank()) {
            // Vincular la edición a una incidencia existente en lugar de crear una nueva.
            order = orderService.updateOrderProductsWithExistingIssue(id, operations,
                    request.getJustification(), request.getIssueId(), currentUser.getId());
        } else {
            order = orderService.updateOrderProductsWithJustification(id, operations,
                    request.getJustification(), currentUser.getId());
        }
        List<OrderProduct> products = orderService.getOrderProducts(order.getId());
        return ResponseEntity.ok(new OrderResponse(order, products, userRepository, productRepository, orderService));
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("@permissionCheck.hasPermission('order', 'read')")
    public ResponseEntity<List<OrderChangeResponse>> getOrderHistory(@PathVariable String id) {
        orderService.getOrderById(id);
        List<OrderChangeResponse> history = orderChangeService.getOrderHistory(id).stream()
                .map(change -> new OrderChangeResponse(
                        change.getId(),
                        change.getOrderId(),
                        change.getOrderProductId(),
                        change.getAction(),
                        change.getUserId(),
                        resolveUserName(change.getUserId()),
                        change.getIssueId(),
                        change.getChangedAt(),
                        change.getSummary(),
                        change.getBeforeJson(),
                        change.getAfterJson()))
                .toList();
        return ResponseEntity.ok(history);
    }

    private String resolveUserName(String userId) {
        if (userId == null) return null;
        return userRepository.findById(userId).map(User::getName).orElse(userId);
    }

    public record OrderChangeResponse(UUID id, String orderId, UUID orderProductId, String action,
            String userId, String userName, String issueId, LocalDateTime changedAt,
            String summary, String beforeJson, String afterJson) {}

    private List<OrderProduct> toOrderProducts(List<OrderProductRequest> requestProducts) {
        return requestProducts.stream()
                .map(p -> OrderProduct.builder()
                        .productId(p.getProductId())
                        .quantity(p.getQuantity())
                        .price(BigDecimal.ZERO) // Price will be calculated by service
                        .configuration(p.getConfiguration() != null && !p.getConfiguration().trim().isEmpty()
                                ? p.getConfiguration()
                                : null)
                        .build())
                .collect(Collectors.toList());
    }

    private List<OrderProductOperation> toOperations(List<OrderProductRequest> requestProducts) {
        return requestProducts.stream()
                .map(p -> new OrderProductOperation(
                        p.getOrderedProductId(),
                        p.getProductId(),
                        p.getQuantity(),
                        p.getConfiguration(),
                        p.getAction() == null || p.getAction().isBlank() ? "added" : p.getAction()))
                .toList();
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<OrderResponse>> listOrders(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String orderId,
            @RequestParam(required = false) String customerName,
            @RequestParam(required = false) String customerId,
            @RequestParam(required = false) List<OrderStatus> status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            Pageable pageable) {
        Page<Order> orders = orderService.listOrders(new OrderFilter(query, orderId, customerName, customerId, status, startDate, endDate), pageable);
        Page<OrderResponse> response = orders.map(order -> {
            List<OrderProduct> products = orderService.getOrderProducts(order.getId());
            return new OrderResponse(order, products, userRepository, productRepository, orderService);
        });
        return ResponseEntity.ok(response);
    }

    @GetMapping("/export")
    @PreAuthorize("@permissionCheck.hasPermission('order', 'read')")
    public ResponseEntity<byte[]> exportOrders(
            @RequestParam(required = false) List<String> dropIds,
            @RequestParam(required = false, defaultValue = "FULL") ExportReportType reportType,
            @RequestParam(required = false) OrderStatus productStatusFilter) throws IOException {
        byte[] excelBytes = orderExportService.exportOrders(dropIds, reportType, productStatusFilter);
        String prefix = switch (reportType) {
            case FACTORY   -> "fabrica";
            case WAREHOUSE -> "almacen";
            case FULL      -> "fabricacion";
        };
        String fileName = prefix + "_" + LocalDate.now() + ".xlsx";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", fileName);
        headers.setContentLength(excelBytes.length);

        return new ResponseEntity<>(excelBytes, headers, HttpStatus.OK);
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
    public ResponseEntity<Void> deleteOrder(@PathVariable String id) {
        orderService.deleteOrder(id);
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

        Page<Order> orders = orderService.listOrders(new OrderFilter(null, null, null, user.getId(), status, startDate, endDate), pageable);
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

    @PutMapping("/my/{id}/deliver")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<OrderResponse> confirmOrderDelivery(
            @PathVariable String id) {
        User user = authService.getCurrentUser(true);
        Order order = orderService.confirmOrderDelivery(id, user.getId());
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

        /** Opcional: ID del socio para el que se crea el pedido (solo con permiso 'order','create'). */
        private String userId;

        /**
         * Obligatorio cuando se crea/modifica un pedido en nombre de un socio (userId presente):
         * justificación con una incidencia o petición. Con esta justificación se crea una
         * incidencia vinculada al pedido automáticamente (trazabilidad).
         */
        private String justification;

        /**
         * Opcional: ID de una incidencia existente a la que vincular la edición.
         * Si se indica, en lugar de crear una incidencia nueva se añade la
         * justificación como comentario a esa incidencia.
         */
        private String issueId;
    }

    @Data
    public static class OrderProductRequest {
        @NotNull(message = "Product ID is required")
        private String productId;

        @NotNull(message = "Quantity is required")
        private Integer quantity;

        private String configuration;

        /** ID del order_product existente (modified/unchanged/removed). */
        private java.util.UUID orderedProductId;

        /** "added" | "modified" | "unchanged" | "removed" (por defecto "added"). */
        private String action;
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
        private OrderStatus status;

        public OrderProductResponse(OrderProduct orderProduct, ProductRepository productRepository) {
            this.id = orderProduct.getId() != null ? orderProduct.getId().toString() : null;
            this.productId = orderProduct.getProductId();
            this.quantity = orderProduct.getQuantity();
            this.price = orderProduct.getPrice();
            this.configuration = orderProduct.getConfiguration();
            if (orderProduct.getOrder() != null) {
                this.status = orderProduct.getOrder().getStatus();
            }

            productRepository.findById(orderProduct.getProductId()).ifPresent(product -> {
                this.productName = product.getName();
            });
        }
    }
}
