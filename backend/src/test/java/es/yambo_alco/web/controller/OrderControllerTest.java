package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.model.Order;
import es.yambo_alco.web.model.OrderFilter;
import es.yambo_alco.web.model.OrderProduct;
import es.yambo_alco.web.model.Product;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.OrderStatus;
import es.yambo_alco.web.repository.ProductRepository;
import es.yambo_alco.web.repository.UserRepository;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.OrderExportService;
import es.yambo_alco.web.service.OrderService;
import es.yambo_alco.web.service.export.ExportReportType;
import es.yambo_alco.web.util.PermissionCheckService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = OrderController.class)
@Import(TestSecurityConfig.class)
@SuppressWarnings("null")
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private OrderService orderService;

    @MockitoBean
    private OrderExportService orderExportService;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private PermissionCheckService permissionCheckService;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private ProductRepository productRepository;

    @BeforeEach
    void setUp() {
        when(permissionCheckService.hasPermission(anyString(), anyString())).thenReturn(true);
        
        // Setup default user mock
        User mockUser = User.builder()
                .id("USER001")
                .name("Test User")
                .email("test@example.com")
                .build();
        when(userRepository.findById("USER001")).thenReturn(Optional.of(mockUser));
        
        // Setup default product mock
        Product mockProduct = Product.builder()
                .id("PROD001")
                .name("Test Product")
                .build();
        when(productRepository.findById("PROD001")).thenReturn(Optional.of(mockProduct));
    }

    @Test
    @WithMockUser
    void createOrder_WithAuth_ShouldCreateOrder() throws Exception {
        User user = User.builder().id("USER001").build();
        
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PAYMENT)
                .createdAt(LocalDateTime.now())
                .build();

        List<OrderProduct> products = List.of(
                OrderProduct.builder()
                        .orderId("ORD001")
                        .productId("PROD001")
                        .quantity(2)
                        .price(BigDecimal.TEN)
                        .configuration("{}")
                        .build()
        );

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(orderService.createOrder(eq("USER001"), any())).thenReturn(order);
        when(orderService.getOrderProducts("ORD001")).thenReturn(products);

        String payload = """
                {
                    "products": [
                        {"productId": "PROD001", "quantity": 2}
                    ]
                }
                """;

        mockMvc.perform(post("/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("ORD001"))
                .andExpect(jsonPath("$.user.id").value("USER001"))
                .andExpect(jsonPath("$.user.name").value("Test User"))
                .andExpect(jsonPath("$.user.email").value("test@example.com"))
                .andExpect(jsonPath("$.products[0].productId").value("PROD001"))
                .andExpect(jsonPath("$.products[0].productName").value("Test Product"))
                .andExpect(jsonPath("$.products[0].quantity").value(2));
    }

    @Test
    @WithMockUser
    void createOrder_WithUserId_AsAdmin_ShouldCreateOrderForMember() throws Exception {
        User admin = User.builder().id("ADMIN001").build();
        Order order = Order.builder()
                .id("ORD002")
                .customerId("USER999")
                .status(OrderStatus.PENDING_PAYMENT)
                .createdAt(LocalDateTime.now())
                .build();

        List<OrderProduct> products = List.of(
                OrderProduct.builder()
                        .orderId("ORD002")
                        .productId("PROD001")
                        .quantity(1)
                        .price(BigDecimal.TEN)
                        .build()
        );

        when(authService.getCurrentUser(true)).thenReturn(admin);
        when(permissionCheckService.hasPermission("order", "create")).thenReturn(true);
        User member = User.builder()
                .id("USER999")
                .name("Member User")
                .email("member@example.com")
                .build();
        when(userRepository.findById("USER999")).thenReturn(Optional.of(member));
        when(orderService.createOrder(eq("USER999"), any())).thenReturn(order);
        when(orderService.getOrderProducts("ORD002")).thenReturn(products);

        String payload = """
                {
                    "userId": "USER999",
                    "products": [
                        {"productId": "PROD001", "quantity": 1}
                    ]
                }
                """;

        mockMvc.perform(post("/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("ORD002"))
                .andExpect(jsonPath("$.user.id").value("USER999"));
    }

    @Test
    @WithMockUser
    void createOrder_WithUserId_WithoutPermission_ShouldReturnForbidden() throws Exception {
        User user = User.builder().id("USER001").build();
        when(authService.getCurrentUser(true)).thenReturn(user);
        when(permissionCheckService.hasPermission("order", "create")).thenReturn(false);

        String payload = """
                {
                    "userId": "USER999",
                    "products": [
                        {"productId": "PROD001", "quantity": 1}
                    ]
                }
                """;

        mockMvc.perform(post("/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    void updateOrder_WithPermission_ShouldReplaceProducts() throws Exception {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PAYMENT_CONFIRMED)
                .createdAt(LocalDateTime.now())
                .build();

        List<OrderProduct> products = List.of(
                OrderProduct.builder()
                        .orderId("ORD001")
                        .productId("PROD001")
                        .quantity(5)
                        .price(BigDecimal.TEN)
                        .build()
        );

        when(orderService.updateOrderProducts(eq("ORD001"), any())).thenReturn(order);
        when(orderService.getOrderProducts("ORD001")).thenReturn(products);

        String payload = """
                {
                    "products": [
                        {"productId": "PROD001", "quantity": 5}
                    ]
                }
                """;

        mockMvc.perform(put("/orders/ORD001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("ORD001"))
                .andExpect(jsonPath("$.products[0].quantity").value(5));
    }

    @Test
    @WithMockUser
    void listOrders_WithAuth_ShouldReturnOrders() throws Exception {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PAYMENT_CONFIRMED)
                .createdAt(LocalDateTime.now())
                .build();

        when(orderService.listOrders(any(OrderFilter.class), any()))
                .thenReturn(new PageImpl<>(List.of(order), PageRequest.of(0, 20), 1));
        when(orderService.getOrderProducts("ORD001")).thenReturn(List.of());

        mockMvc.perform(get("/orders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value("ORD001"))
                .andExpect(jsonPath("$.content[0].user.name").value("Test User"))
                .andExpect(jsonPath("$.content[0].status").value("PAYMENT_CONFIRMED"));
    }

    @Test
    @WithMockUser
    void getOrder_WithAuth_ShouldReturnOrder() throws Exception {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PAYMENT_CONFIRMED)
                .createdAt(LocalDateTime.now())
                .build();

        when(orderService.getOrderById("ORD001")).thenReturn(order);
        when(orderService.getOrderProducts("ORD001")).thenReturn(List.of());

        mockMvc.perform(get("/orders/ORD001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("ORD001"))
                .andExpect(jsonPath("$.user.name").value("Test User"))
                .andExpect(jsonPath("$.user.email").value("test@example.com"))
                .andExpect(jsonPath("$.status").value("PAYMENT_CONFIRMED"));
    }

    @Test
    @WithMockUser
    void updateOrderStatus_WithPermission_ShouldUpdate() throws Exception {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PRODUCTS)
                .createdAt(LocalDateTime.now())
                .build();

        when(orderService.updateOrderStatus("ORD001", OrderStatus.PENDING_PRODUCTS)).thenReturn(order);
        when(orderService.getOrderProducts("ORD001")).thenReturn(List.of());

        String payload = """
                {"status": "PENDING_PRODUCTS"}
                """;

        mockMvc.perform(put("/orders/ORD001/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.name").value("Test User"))
                .andExpect(jsonPath("$.status").value("PENDING_PRODUCTS"));
    }

    @Test
    @WithMockUser
    void cancelOrder_WithPermission_ShouldReturnNoContent() throws Exception {
        mockMvc.perform(delete("/orders/ORD001"))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser
    void cancelMyOrder_AsOwner_ShouldReturnCanceledOrder() throws Exception {
        User user = User.builder().id("USER001").build();
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PAYMENT)
                .createdAt(LocalDateTime.now())
                .build();
        Order canceledOrder = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.CANCELED)
                .createdAt(LocalDateTime.now())
                .closedAt(LocalDateTime.now())
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(orderService.getOrderById("ORD001")).thenReturn(order);
        when(orderService.cancelOrder("ORD001", false)).thenReturn(canceledOrder);
        when(orderService.getOrderProducts("ORD001")).thenReturn(List.of());

        mockMvc.perform(put("/orders/my/ORD001/cancel"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("ORD001"))
                .andExpect(jsonPath("$.status").value("CANCELED"));
    }

    @Test
    @WithMockUser
    void getMyOrders_WithAuth_ShouldReturnOrders() throws Exception {
        User user = User.builder().id("USER001").build();
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PAYMENT_CONFIRMED)
                .createdAt(LocalDateTime.now())
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(orderService.listOrders(any(OrderFilter.class), any()))
                .thenReturn(new PageImpl<>(List.of(order), PageRequest.of(0, 20), 1));
        when(orderService.getOrderProducts("ORD001")).thenReturn(List.of());

        mockMvc.perform(get("/orders/my"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value("ORD001"))
                .andExpect(jsonPath("$.content[0].user.id").value("USER001"))
                .andExpect(jsonPath("$.content[0].user.name").value("Test User"))
                .andExpect(jsonPath("$.content[0].user.email").value("test@example.com"));
    }

    @Test
    @WithMockUser
    void uploadReceipt_WithAuth_ShouldReturnUpdatedOrder() throws Exception {
        User user = User.builder().id("USER001").build();
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.CONFIRMING_PAYMENT)
                .receiptFileId("FL000001")
                .createdAt(LocalDateTime.now())
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(orderService.uploadReceipt("ORD001", "USER001", "FL000001")).thenReturn(order);
        when(orderService.getOrderProducts("ORD001")).thenReturn(List.of());

        String payload = """
                {"fileId": "FL000001"}
                """;

        mockMvc.perform(put("/orders/my/ORD001/receipt")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("ORD001"))
                .andExpect(jsonPath("$.status").value("CONFIRMING_PAYMENT"))
                .andExpect(jsonPath("$.receiptFileId").value("FL000001"));
    }

    @Test
    @WithMockUser
    void exportOrders_WithAuth_ShouldReturnXlsxFile() throws Exception {
        byte[] fakeExcel = new byte[]{0x50, 0x4B, 0x03, 0x04}; // PK zip header
        when(orderExportService.exportOrders(any(), any(ExportReportType.class), any())).thenReturn(fakeExcel);

        mockMvc.perform(get("/orders/export"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .andExpect(header().exists("Content-Disposition"))
                .andExpect(content().bytes(fakeExcel));
    }

    @Test
    @WithMockUser
    void exportOrders_WithDropIds_ShouldPassDropIds() throws Exception {
        byte[] fakeExcel = new byte[]{0x50, 0x4B, 0x03, 0x04};
        when(orderExportService.exportOrders(eq(List.of("DROP001", "DROP002")), any(ExportReportType.class), any())).thenReturn(fakeExcel);

        mockMvc.perform(get("/orders/export")
                .param("dropIds", "DROP001", "DROP002"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
    }

    @Test
    @WithMockUser
    void adminUploadReceipt_WithAuth_ShouldReturnUpdatedOrder() throws Exception {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.CONFIRMING_PAYMENT)
                .receiptFileId("FL000001")
                .createdAt(LocalDateTime.now())
                .build();

        when(permissionCheckService.hasPermission("order", "update")).thenReturn(true);
        when(orderService.uploadReceiptAsAdmin("ORD001", "FL000001")).thenReturn(order);
        when(orderService.getOrderProducts("ORD001")).thenReturn(List.of());

        String payload = """
                {"fileId": "FL000001"}
                """;

        mockMvc.perform(put("/orders/ORD001/receipt")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("ORD001"))
                .andExpect(jsonPath("$.status").value("CONFIRMING_PAYMENT"))
                .andExpect(jsonPath("$.receiptFileId").value("FL000001"));
    }

    @Test
    @WithMockUser
    void confirmOrderProductDelivery_AsOwner_ShouldReturnUpdatedOrder() throws Exception {
        User user = User.builder().id("USER001").build();
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PRODUCTS)
                .createdAt(LocalDateTime.now())
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(orderService.confirmOrderDelivery("ORD001", "USER001")).thenReturn(order);
        when(orderService.getOrderProducts("ORD001")).thenReturn(List.of());

        mockMvc.perform(put("/orders/my/ORD001/deliver"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("ORD001"))
                .andExpect(jsonPath("$.status").value("PENDING_PRODUCTS"));
    }

    @Test
    void confirmOrderProductDelivery_WithoutAuth_ShouldReturn403() throws Exception {
        mockMvc.perform(put("/orders/my/ORD001/deliver"))
                .andExpect(status().isForbidden());
    }
}
