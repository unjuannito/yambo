package es.yambo_alco.web.service;

import es.yambo_alco.web.model.*;
import es.yambo_alco.web.model.enums.OrderStatus;
import es.yambo_alco.web.model.enums.PermissionAction;
import es.yambo_alco.web.model.enums.PermissionResource;
import es.yambo_alco.web.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class DashboardServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private FamilyProductRepository familyProductRepository;

    @Mock
    private ActivityRepository activityRepository;

    @Mock
    private IssueRepository issueRepository;

    @InjectMocks
    private DashboardService dashboardService;

    private User regularUser;
    private User adminUser;

    @BeforeEach
    void setUp() {
        // Regular user with no admin permissions
        regularUser = User.builder()
                .id("USER001")
                .email("user@test.com")
                .name("Regular User")
                .profiles(Set.of())
                .build();

        // Admin user with all admin permissions
        Permission userReadPermission = Permission.builder()
                .id("PERM001")
                .resource(PermissionResource.USER)
                .action(PermissionAction.READ)
                .build();

        Permission orderReadPermission = Permission.builder()
                .id("PERM002")
                .resource(PermissionResource.ORDER)
                .action(PermissionAction.READ)
                .build();

        Permission projectReadPermission = Permission.builder()
                .id("PERM003")
                .resource(PermissionResource.PROJECT)
                .action(PermissionAction.READ)
                .build();

        Permission activityReadPermission = Permission.builder()
                .id("PERM004")
                .resource(PermissionResource.ACTIVITY)
                .action(PermissionAction.READ)
                .build();

        Permission familyProductReadPermission = Permission.builder()
                .id("PERM005")
                .resource(PermissionResource.FAMILY_PRODUCT)
                .action(PermissionAction.READ)
                .build();

        Profile adminProfile = Profile.builder()
                .id("PROF001")
                .name("Admin")
                .permissions(Set.of(
                        userReadPermission,
                        orderReadPermission,
                        projectReadPermission,
                        activityReadPermission,
                        familyProductReadPermission
                ))
                .build();

        adminUser = User.builder()
                .id("ADMIN001")
                .email("admin@test.com")
                .name("Admin User")
                .profiles(Set.of(adminProfile))
                .build();
    }

    @Test
    void getDashboardData_ForRegularUser_ShouldReturnOnlyPersonalData() {
        // Arrange
        Order order1 = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PAYMENT)
                .createdAt(LocalDateTime.now().minusDays(1))
                .build();

        Order order2 = Order.builder()
                .id("ORD002")
                .customerId("USER001")
                .status(OrderStatus.PAYMENT_CONFIRMED)
                .createdAt(LocalDateTime.now())
                .build();

        when(orderRepository.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of(order2, order1));
        when(issueRepository.count(any(Specification.class))).thenReturn(3L);

        // Act
        DashboardService.DashboardData result = dashboardService.getDashboardData(regularUser);

        // Assert
        assertNotNull(result);
        assertNotNull(result.personal());
        assertNull(result.admin()); // No admin data for regular user

        assertEquals(2, result.personal().totalOrders());
        assertEquals(3L, result.personal().totalIssues());
        assertEquals(2, result.personal().recentOrders().size());
        assertEquals(1L, result.personal().ordersByStatus().get("PENDING_PAYMENT"));
        assertEquals(1L, result.personal().ordersByStatus().get("PAYMENT_CONFIRMED"));

        // Verify no admin repository calls
        verify(userRepository, never()).count();
        verify(projectRepository, never()).count();
        verify(familyProductRepository, never()).count();
        verify(activityRepository, never()).findAll(any(Pageable.class));
    }

    @Test
    void getDashboardData_ForAdminUser_ShouldReturnPersonalAndAdminData() {
        // Arrange - Personal data
        Order order = Order.builder()
                .id("ORD001")
                .customerId("ADMIN001")
                .status(OrderStatus.CLOSED)
                .createdAt(LocalDateTime.now())
                .build();

        when(orderRepository.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of(order));
        when(issueRepository.count(any(Specification.class))).thenReturn(0L);

        // Arrange - Admin data
        when(userRepository.count()).thenReturn(50L);
        when(orderRepository.count()).thenReturn(100L);
        when(projectRepository.count()).thenReturn(10L);
        when(familyProductRepository.count()).thenReturn(25L);

        Activity activity = Activity.builder()
                .id("ACT001")
                .name("Test Activity")
                .date(LocalDateTime.now())
                .build();
        when(activityRepository.findAll(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(activity)));

        // Act
        DashboardService.DashboardData result = dashboardService.getDashboardData(adminUser);

        // Assert
        assertNotNull(result);
        assertNotNull(result.personal());
        assertNotNull(result.admin());

        // Personal data
        assertEquals(1, result.personal().totalOrders());
        assertEquals(0L, result.personal().totalIssues());

        // Admin data
        assertEquals(50L, result.admin().totalUsers());
        assertEquals(100L, result.admin().totalOrders());
        assertEquals(10L, result.admin().totalProjects());
        assertEquals(25L, result.admin().totalProducts());
        assertNotNull(result.admin().recentActivities());
        assertEquals(1, result.admin().recentActivities().size());
        assertEquals("ACT001", result.admin().recentActivities().get(0).getId());
    }

    @Test
    void getDashboardData_WithNoOrders_ShouldReturnEmptyPersonalData() {
        // Arrange
        when(orderRepository.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of());
        when(issueRepository.count(any(Specification.class))).thenReturn(0L);

        // Act
        DashboardService.DashboardData result = dashboardService.getDashboardData(regularUser);

        // Assert
        assertNotNull(result);
        assertEquals(0, result.personal().totalOrders());
        assertTrue(result.personal().recentOrders().isEmpty());
        assertTrue(result.personal().ordersByStatus().isEmpty());
    }

    @Test
    void getDashboardData_ShouldLimitRecentOrdersToFive() {
        // Arrange - Create 10 orders
        List<Order> orders = new java.util.ArrayList<>();
        for (int i = 0; i < 10; i++) {
            orders.add(Order.builder()
                    .id("ORD00" + i)
                    .customerId("USER001")
                    .status(OrderStatus.PENDING_PAYMENT)
                    .createdAt(LocalDateTime.now().minusHours(i))
                    .build());
        }

        when(orderRepository.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(orders);
        when(issueRepository.count(any(Specification.class))).thenReturn(0L);

        // Act
        DashboardService.DashboardData result = dashboardService.getDashboardData(regularUser);

        // Assert
        assertEquals(10, result.personal().totalOrders());
        assertEquals(5, result.personal().recentOrders().size());
    }

    @Test
    void getDashboardData_WithPartialAdminPermissions_ShouldReturnPartialAdminData() {
        // Arrange - User with only user:read permission
        Permission userReadPermission = Permission.builder()
                .id("PERM001")
                .resource(PermissionResource.USER)
                .action(PermissionAction.READ)
                .build();

        Profile partialAdminProfile = Profile.builder()
                .id("PROF002")
                .name("Partial Admin")
                .permissions(Set.of(userReadPermission))
                .build();

        User partialAdminUser = User.builder()
                .id("PARTIAL001")
                .email("partial@test.com")
                .name("Partial Admin")
                .profiles(Set.of(partialAdminProfile))
                .build();

        when(orderRepository.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of());
        when(issueRepository.count(any(Specification.class))).thenReturn(0L);
        when(userRepository.count()).thenReturn(25L);

        // Act
        DashboardService.DashboardData result = dashboardService.getDashboardData(partialAdminUser);

        // Assert
        assertNotNull(result.admin());
        assertEquals(25L, result.admin().totalUsers());
        assertNull(result.admin().totalOrders()); // No order:read permission
        assertNull(result.admin().totalProjects()); // No project:read permission
        assertNull(result.admin().totalProducts()); // No family_product:read permission
        assertNull(result.admin().recentActivities()); // No activity:read permission

        // Verify only userRepository.count() was called
        verify(userRepository).count();
        verify(orderRepository, never()).count();
        verify(projectRepository, never()).count();
        verify(familyProductRepository, never()).count();
        verify(activityRepository, never()).findAll(any(Pageable.class));
    }

    @Test
    void getDashboardData_ShouldGroupOrdersByStatus() {
        // Arrange
        Order pendingOrder1 = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PAYMENT)
                .createdAt(LocalDateTime.now())
                .build();

        Order pendingOrder2 = Order.builder()
                .id("ORD002")
                .customerId("USER001")
                .status(OrderStatus.PENDING_PAYMENT)
                .createdAt(LocalDateTime.now())
                .build();

        Order confirmedOrder = Order.builder()
                .id("ORD003")
                .customerId("USER001")
                .status(OrderStatus.PAYMENT_CONFIRMED)
                .createdAt(LocalDateTime.now())
                .build();

        Order closedOrder = Order.builder()
                .id("ORD004")
                .customerId("USER001")
                .status(OrderStatus.CLOSED)
                .createdAt(LocalDateTime.now())
                .build();

        when(orderRepository.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of(pendingOrder1, pendingOrder2, confirmedOrder, closedOrder));
        when(issueRepository.count(any(Specification.class))).thenReturn(0L);

        // Act
        DashboardService.DashboardData result = dashboardService.getDashboardData(regularUser);

        // Assert
        assertEquals(4, result.personal().totalOrders());
        assertEquals(2L, result.personal().ordersByStatus().get("PENDING_PAYMENT"));
        assertEquals(1L, result.personal().ordersByStatus().get("PAYMENT_CONFIRMED"));
        assertEquals(1L, result.personal().ordersByStatus().get("CLOSED"));
    }
}
