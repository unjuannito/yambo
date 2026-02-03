package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.model.Order;
import es.yambo_alco.web.model.OrderProduct;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.OrderStatus;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.OrderService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
    private AuthService authService;

    @MockitoBean
    private PermissionCheckService permissionCheckService;

    @BeforeEach
    void setUp() {
        when(permissionCheckService.hasPermission(anyString(), anyString())).thenReturn(true);
    }

    @Test
    @WithMockUser
    void createOrder_WithAuth_ShouldCreateOrder() throws Exception {
        Order order = Order.builder()
                .id("ORD001")
                .customerId(1001)
                .status(OrderStatus.PENDING_CONFIRMATION)
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

        when(orderService.createOrder(eq(1001), any())).thenReturn(order);
        when(orderService.getOrderProducts("ORD001")).thenReturn(products);

        String payload = """
                {
                    "customerId": 1001,
                    "products": [
                        {"productId": "PROD001", "quantity": 2, "price": 10.0, "configuration": "{}"}
                    ]
                }
                """;

        mockMvc.perform(post("/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("ORD001"))
                .andExpect(jsonPath("$.products[0].productId").value("PROD001"))
                .andExpect(jsonPath("$.products[0].quantity").value(2));
    }

    @Test
    @WithMockUser
    void listOrders_WithAuth_ShouldReturnOrders() throws Exception {
        Order order = Order.builder()
                .id("ORD001")
                .customerId(1001)
                .status(OrderStatus.CONFIRMED)
                .createdAt(LocalDateTime.now())
                .build();

        when(orderService.listOrders(eq(null), eq(null), eq(null), eq(null), any()))
                .thenReturn(new PageImpl<>(List.of(order), PageRequest.of(0, 20), 1));
        when(orderService.getOrderProducts("ORD001")).thenReturn(List.of());

        mockMvc.perform(get("/orders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value("ORD001"))
                .andExpect(jsonPath("$.content[0].status").value("CONFIRMED"));
    }

    @Test
    @WithMockUser
    void getOrder_WithAuth_ShouldReturnOrder() throws Exception {
        Order order = Order.builder()
                .id("ORD001")
                .customerId(1001)
                .status(OrderStatus.CONFIRMED)
                .createdAt(LocalDateTime.now())
                .build();

        when(orderService.getOrderById("ORD001")).thenReturn(order);
        when(orderService.getOrderProducts("ORD001")).thenReturn(List.of());

        mockMvc.perform(get("/orders/ORD001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("ORD001"))
                .andExpect(jsonPath("$.status").value("CONFIRMED"));
    }

    @Test
    @WithMockUser
    void updateOrderStatus_WithPermission_ShouldUpdate() throws Exception {
        Order order = Order.builder()
                .id("ORD001")
                .customerId(1001)
                .status(OrderStatus.IN_PROGRESS)
                .createdAt(LocalDateTime.now())
                .build();

        when(orderService.updateOrderStatus("ORD001", OrderStatus.IN_PROGRESS)).thenReturn(order);
        when(orderService.getOrderProducts("ORD001")).thenReturn(List.of());

        String payload = """
                {"status": "IN_PROGRESS"}
                """;

        mockMvc.perform(put("/orders/ORD001/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    }

    @Test
    @WithMockUser
    void cancelOrder_WithPermission_ShouldReturnNoContent() throws Exception {
        mockMvc.perform(delete("/orders/ORD001"))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser
    void getMyOrders_WithAuth_ShouldReturnOrders() throws Exception {
        User user = User.builder().id("0000000a").build();
        Order order = Order.builder()
                .id("ORD001")
                .customerId(10)
                .status(OrderStatus.CONFIRMED)
                .createdAt(LocalDateTime.now())
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(orderService.getOrdersByCustomer(10)).thenReturn(List.of(order));
        when(orderService.getOrderProducts("ORD001")).thenReturn(List.of());

        mockMvc.perform(get("/orders/my"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("ORD001"))
                .andExpect(jsonPath("$[0].customerId").value(10));
    }
}
