package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.model.*;
import es.yambo_alco.web.model.enums.ActivityStatus;
import es.yambo_alco.web.model.enums.OrderStatus;
import es.yambo_alco.web.repository.ProductRepository;
import es.yambo_alco.web.repository.UserRepository;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.DashboardService;
import es.yambo_alco.web.service.DashboardService.AdminDashboardData;
import es.yambo_alco.web.service.DashboardService.DashboardData;
import es.yambo_alco.web.service.DashboardService.PersonalDashboardData;
import es.yambo_alco.web.service.OrderService;
import es.yambo_alco.web.util.PermissionCheckService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = DashboardController.class)
@Import(TestSecurityConfig.class)
@SuppressWarnings("null")
class DashboardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DashboardService dashboardService;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private OrderService orderService;

    @MockitoBean
    private PermissionCheckService permissionCheckService;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private ProductRepository productRepository;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id("USER001")
                .email("test@example.com")
                .name("Test User")
                .profiles(Set.of())
                .build();

        when(authService.getCurrentUser(true)).thenReturn(testUser);
        when(userRepository.findById("USER001")).thenReturn(Optional.of(testUser));

        Product mockProduct = Product.builder()
                .id("PROD001")
                .name("Test Product")
                .build();
        when(productRepository.findById(anyString())).thenReturn(Optional.of(mockProduct));
    }

    @Test
    @WithMockUser
    void getDashboard_WithAuth_ShouldReturnPersonalData() throws Exception {
        // Arrange
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PAYMENT)
                .createdAt(LocalDateTime.now())
                .build();

        PersonalDashboardData personal = new PersonalDashboardData(
                5,
                Map.of("PENDING_PAYMENT", 3L, "CLOSED", 2L),
                List.of(order),
                2L
        );

        DashboardData dashboardData = new DashboardData(personal, null);
        when(dashboardService.getDashboardData(any(User.class))).thenReturn(dashboardData);
        when(orderService.getOrderProducts("ORD001")).thenReturn(List.of());
        when(orderService.hasOpenIssues("ORD001")).thenReturn(false);

        // Act & Assert
        mockMvc.perform(get("/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.personal.totalOrders").value(5))
                .andExpect(jsonPath("$.personal.totalIssues").value(2))
                .andExpect(jsonPath("$.personal.ordersByStatus.PENDING_PAYMENT").value(3))
                .andExpect(jsonPath("$.personal.ordersByStatus.CLOSED").value(2))
                .andExpect(jsonPath("$.personal.recentOrders[0].id").value("ORD001"))
                .andExpect(jsonPath("$.personal.recentOrders[0].status").value("PENDING_PAYMENT"))
                .andExpect(jsonPath("$.admin").doesNotExist());
    }

    @Test
    @WithMockUser
    void getDashboard_WithAdminPermissions_ShouldReturnAdminData() throws Exception {
        // Arrange
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.CLOSED)
                .createdAt(LocalDateTime.now())
                .build();

        Activity activity = Activity.builder()
                .id("ACT001")
                .name("Test Activity")
                .description("Activity description")
                .date(LocalDateTime.now())
                .status(ActivityStatus.PLANNED)
                .isPublic(true)
                .build();

        PersonalDashboardData personal = new PersonalDashboardData(
                1,
                Map.of("CLOSED", 1L),
                List.of(order),
                0L
        );

        AdminDashboardData admin = new AdminDashboardData(
                50L,
                100L,
                10L,
                25L,
                List.of(activity)
        );

        DashboardData dashboardData = new DashboardData(personal, admin);
        when(dashboardService.getDashboardData(any(User.class))).thenReturn(dashboardData);
        when(orderService.getOrderProducts("ORD001")).thenReturn(List.of());
        when(orderService.hasOpenIssues("ORD001")).thenReturn(false);

        // Act & Assert
        mockMvc.perform(get("/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.personal.totalOrders").value(1))
                .andExpect(jsonPath("$.admin.totalUsers").value(50))
                .andExpect(jsonPath("$.admin.totalOrders").value(100))
                .andExpect(jsonPath("$.admin.totalProjects").value(10))
                .andExpect(jsonPath("$.admin.totalProducts").value(25))
                .andExpect(jsonPath("$.admin.recentActivities[0].id").value("ACT001"))
                .andExpect(jsonPath("$.admin.recentActivities[0].name").value("Test Activity"));
    }

    @Test
    @WithMockUser
    void getDashboard_WithOrderProducts_ShouldMapProductDetails() throws Exception {
        // Arrange
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PAYMENT)
                .createdAt(LocalDateTime.now())
                .build();

        OrderProduct orderProduct = OrderProduct.builder()
                .orderId("ORD001")
                .productId("PROD001")
                .quantity(2)
                .price(java.math.BigDecimal.valueOf(19.99))
                .build();

        PersonalDashboardData personal = new PersonalDashboardData(
                1,
                Map.of("PENDING_PAYMENT", 1L),
                List.of(order),
                0L
        );

        DashboardData dashboardData = new DashboardData(personal, null);
        when(dashboardService.getDashboardData(any(User.class))).thenReturn(dashboardData);
        when(orderService.getOrderProducts("ORD001")).thenReturn(List.of(orderProduct));
        when(orderService.hasOpenIssues("ORD001")).thenReturn(false);

        // Act & Assert
        mockMvc.perform(get("/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.personal.recentOrders[0].products[0].productId").value("PROD001"))
                .andExpect(jsonPath("$.personal.recentOrders[0].products[0].productName").value("Test Product"))
                .andExpect(jsonPath("$.personal.recentOrders[0].products[0].quantity").value(2));
    }

    @Test
    @WithMockUser
    void getDashboard_WithOpenIssues_ShouldIndicateHasOpenIssues() throws Exception {
        // Arrange
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PAYMENT)
                .createdAt(LocalDateTime.now())
                .build();

        PersonalDashboardData personal = new PersonalDashboardData(
                1,
                Map.of("PENDING_PAYMENT", 1L),
                List.of(order),
                1L
        );

        DashboardData dashboardData = new DashboardData(personal, null);
        when(dashboardService.getDashboardData(any(User.class))).thenReturn(dashboardData);
        when(orderService.getOrderProducts("ORD001")).thenReturn(List.of());
        when(orderService.hasOpenIssues("ORD001")).thenReturn(true);

        // Act & Assert
        mockMvc.perform(get("/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.personal.recentOrders[0].hasOpenIssues").value(true));
    }

    @Test
    @WithMockUser
    void getDashboard_WithEmptyData_ShouldReturnEmptyArrays() throws Exception {
        // Arrange
        PersonalDashboardData personal = new PersonalDashboardData(
                0,
                Map.of(),
                List.of(),
                0L
        );

        DashboardData dashboardData = new DashboardData(personal, null);
        when(dashboardService.getDashboardData(any(User.class))).thenReturn(dashboardData);

        // Act & Assert
        mockMvc.perform(get("/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.personal.totalOrders").value(0))
                .andExpect(jsonPath("$.personal.totalIssues").value(0))
                .andExpect(jsonPath("$.personal.recentOrders").isArray())
                .andExpect(jsonPath("$.personal.recentOrders").isEmpty())
                .andExpect(jsonPath("$.personal.ordersByStatus").isMap());
    }

    @Test
    @WithMockUser
    void getDashboard_WithPartialAdminData_ShouldReturnNullableFields() throws Exception {
        // Arrange - Admin with only totalUsers permission
        PersonalDashboardData personal = new PersonalDashboardData(0, Map.of(), List.of(), 0L);
        AdminDashboardData admin = new AdminDashboardData(
                50L,    // totalUsers
                null,   // totalOrders - no permission
                null,   // totalProjects - no permission
                null,   // totalProducts - no permission
                null    // recentActivities - no permission
        );

        DashboardData dashboardData = new DashboardData(personal, admin);
        when(dashboardService.getDashboardData(any(User.class))).thenReturn(dashboardData);

        // Act & Assert
        mockMvc.perform(get("/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.admin.totalUsers").value(50))
                .andExpect(jsonPath("$.admin.totalOrders").doesNotExist())
                .andExpect(jsonPath("$.admin.totalProjects").doesNotExist())
                .andExpect(jsonPath("$.admin.totalProducts").doesNotExist())
                .andExpect(jsonPath("$.admin.recentActivities").doesNotExist());
    }

    @Test
    void getDashboard_WithoutAuth_ShouldReturnForbidden() throws Exception {
        // Without authentication, the endpoint should return 403 Forbidden
        mockMvc.perform(get("/dashboard"))
                .andExpect(status().isForbidden());
    }
}
