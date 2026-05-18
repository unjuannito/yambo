package es.yambo_alco.web.service;

import es.yambo_alco.web.model.*;
import es.yambo_alco.web.model.enums.IssueStatus;
import es.yambo_alco.web.model.enums.OrderStatus;
import es.yambo_alco.web.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SuppressWarnings("unchecked")
@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock private OrderRepository orderRepository;
    @Mock private OrderProductRepository orderProductRepository;
    @Mock private UserRepository userRepository;
    @Mock private IssueRepository issueRepository;
    @Mock private IssueCommentRepository issueCommentRepository;
    @Mock private UserLoginHistoryRepository userLoginHistoryRepository;
    @Mock private OrderStatusHistoryRepository orderStatusHistoryRepository;
    @Mock private ProductRepository productRepository;
    @Mock private ProductViewRepository productViewRepository;

    @InjectMocks
    private ReportService reportService;

    private static final LocalDate START = LocalDate.of(2025, 1, 1);
    private static final LocalDate END   = LocalDate.of(2025, 1, 31);

    // ═══════════════════════════════════════════════════════════════
    // getOrderAnalytics
    // ═══════════════════════════════════════════════════════════════

    @Test
    void getOrderAnalytics_WhenNoOrders_ShouldReturnZeroMetrics() {
        when(orderRepository.findAll(any(Specification.class))).thenReturn(List.of());

        ReportService.OrderAnalytics result = reportService.getOrderAnalytics(START, END);

        assertEquals(0L, result.totalOrders());
        assertEquals(BigDecimal.ZERO, result.totalRevenue());
        assertEquals(BigDecimal.ZERO, result.averageOrderValue());
        assertNull(result.averageFulfillmentHours());
        assertTrue(result.ordersByStatus().isEmpty());
        assertTrue(result.ordersOverTime().isEmpty());
        assertTrue(result.revenueOverTime().isEmpty());
    }

    @Test
    void getOrderAnalytics_WithOrders_ShouldCalculateRevenue() {
        Order order1 = Order.builder()
                .id("ORD001")
                .customerId("USR001")
                .status(OrderStatus.PAYMENT_CONFIRMED)
                .createdAt(LocalDateTime.of(2025, 1, 10, 10, 0))
                .build();
        Order order2 = Order.builder()
                .id("ORD002")
                .customerId("USR001")
                .status(OrderStatus.PAYMENT_CONFIRMED)
                .createdAt(LocalDateTime.of(2025, 1, 15, 12, 0))
                .build();

        OrderProduct op1 = OrderProduct.builder()
                .id(UUID.randomUUID())
                .orderId("ORD001")
                .productId("PROD001")
                .quantity(2)
                .price(BigDecimal.valueOf(10))
                .build();
        OrderProduct op2 = OrderProduct.builder()
                .id(UUID.randomUUID())
                .orderId("ORD002")
                .productId("PROD002")
                .quantity(3)
                .price(BigDecimal.valueOf(5))
                .build();

        when(orderRepository.findAll(any(Specification.class))).thenReturn(List.of(order1, order2));
        when(orderProductRepository.findAll(any(Specification.class)))
                .thenReturn(List.of(op1))
                .thenReturn(List.of(op2));

        ReportService.OrderAnalytics result = reportService.getOrderAnalytics(START, END);

        assertEquals(2L, result.totalOrders());
        // order1 revenue: 2*10 = 20; order2 revenue: 3*5 = 15; total = 35
        assertEquals(0, BigDecimal.valueOf(35).compareTo(result.totalRevenue()));
        // avgOrderValue: 35/2 = 17.50
        assertEquals(0, new BigDecimal("17.50").compareTo(result.averageOrderValue()));
        assertNull(result.averageFulfillmentHours());
    }

    @Test
    void getOrderAnalytics_WithCanceledOrder_ShouldExcludeFromRevenue() {
        Order canceled = Order.builder()
                .id("ORD001")
                .customerId("USR001")
                .status(OrderStatus.CANCELED)
                .createdAt(LocalDateTime.of(2025, 1, 10, 10, 0))
                .build();

        when(orderRepository.findAll(any(Specification.class))).thenReturn(List.of(canceled));

        ReportService.OrderAnalytics result = reportService.getOrderAnalytics(START, END);

        assertEquals(1L, result.totalOrders());
        assertEquals(BigDecimal.ZERO, result.totalRevenue());
        assertEquals(BigDecimal.ZERO, result.averageOrderValue());
        // orderProductRepository should never be called for CANCELED orders
        verify(orderProductRepository, never()).findAll(any(Specification.class));
    }

    @Test
    void getOrderAnalytics_WithClosedOrder_ShouldCalculateFulfillmentHours() {
        LocalDateTime createdAt = LocalDateTime.of(2025, 1, 1, 10, 0);
        LocalDateTime closedAt  = LocalDateTime.of(2025, 1, 2, 10, 0); // exactly 24h later
        Order closed = Order.builder()
                .id("ORD001")
                .customerId("USR001")
                .status(OrderStatus.CLOSED)
                .createdAt(createdAt)
                .closedAt(closedAt)
                .build();

        when(orderRepository.findAll(any(Specification.class))).thenReturn(List.of(closed));
        when(orderProductRepository.findAll(any(Specification.class))).thenReturn(List.of());

        ReportService.OrderAnalytics result = reportService.getOrderAnalytics(START, END);

        assertNotNull(result.averageFulfillmentHours());
        assertEquals(24.0, result.averageFulfillmentHours());
    }

    @Test
    void getOrderAnalytics_ShouldGroupOrdersByStatus() {
        Order o1 = Order.builder().id("O1").customerId("U1").status(OrderStatus.PAYMENT_CONFIRMED)
                .createdAt(LocalDateTime.of(2025, 1, 5, 10, 0)).build();
        Order o2 = Order.builder().id("O2").customerId("U1").status(OrderStatus.CANCELED)
                .createdAt(LocalDateTime.of(2025, 1, 6, 10, 0)).build();
        Order o3 = Order.builder().id("O3").customerId("U1").status(OrderStatus.PAYMENT_CONFIRMED)
                .createdAt(LocalDateTime.of(2025, 1, 7, 10, 0)).build();

        when(orderRepository.findAll(any(Specification.class))).thenReturn(List.of(o1, o2, o3));
        when(orderProductRepository.findAll(any(Specification.class))).thenReturn(List.of());

        ReportService.OrderAnalytics result = reportService.getOrderAnalytics(START, END);

        assertEquals(2L, result.ordersByStatus().get("PAYMENT_CONFIRMED"));
        assertEquals(1L, result.ordersByStatus().get("CANCELED"));
    }

    // ═══════════════════════════════════════════════════════════════
    // getUserEngagement
    // ═══════════════════════════════════════════════════════════════

    @Test
    void getUserEngagement_ShouldReturnMetrics() {
        when(userRepository.count()).thenReturn(100L);
        when(userRepository.count(any(Specification.class))).thenReturn(5L);
        when(userRepository.findAll(any(Specification.class))).thenReturn(List.of());
        when(userLoginHistoryRepository.countDistinctUsersBetween(any(), any())).thenReturn(40L);
        when(userLoginHistoryRepository.countLoginsBetween(any(), any())).thenReturn(200L);
        List<Object[]> activeByDay = new ArrayList<>();
        activeByDay.add(new Object[]{"2025-01-05", 5L});
        when(userLoginHistoryRepository.countActiveUsersByDay(any(), any()))
                .thenReturn(activeByDay);

        ReportService.UserEngagement result = reportService.getUserEngagement(START, END);

        assertEquals(100L, result.totalUsers());
        assertEquals(5L, result.newRegistrations());
        assertEquals(40L, result.activeUsers());
        assertEquals(200L, result.totalLogins());
        // engagementRate = round(40/100 * 1000) / 10.0 = 40.0
        assertEquals(40.0, result.engagementRate());
        assertEquals(1, result.activeUsersOverTime().size());
        assertEquals("2025-01-05", result.activeUsersOverTime().get(0).date());
        assertEquals(5L, result.activeUsersOverTime().get(0).value());
    }

    @Test
    void getUserEngagement_WithZeroTotalUsers_ShouldReturnZeroEngagementRate() {
        when(userRepository.count()).thenReturn(0L);
        when(userRepository.count(any(Specification.class))).thenReturn(0L);
        when(userRepository.findAll(any(Specification.class))).thenReturn(List.of());
        when(userLoginHistoryRepository.countDistinctUsersBetween(any(), any())).thenReturn(0L);
        when(userLoginHistoryRepository.countLoginsBetween(any(), any())).thenReturn(0L);
        when(userLoginHistoryRepository.countActiveUsersByDay(any(), any())).thenReturn(List.of());

        ReportService.UserEngagement result = reportService.getUserEngagement(START, END);

        assertEquals(0.0, result.engagementRate());
    }

    // ═══════════════════════════════════════════════════════════════
    // getIssueMetrics
    // ═══════════════════════════════════════════════════════════════

    @Test
    void getIssueMetrics_WhenNoIssues_ShouldReturnZeros() {
        when(issueRepository.findAll(any(Specification.class))).thenReturn(List.of());

        ReportService.IssueMetrics result = reportService.getIssueMetrics(START, END);

        assertEquals(0L, result.totalIssues());
        assertEquals(0L, result.openIssues());
        assertEquals(0L, result.closedIssues());
        assertNull(result.averageResolutionHours());
        assertTrue(result.issuesByStatus().isEmpty());
    }

    @Test
    void getIssueMetrics_ShouldCountOpenAndClosedIssues() {
        Issue openIssue   = Issue.builder().id("I1").status(IssueStatus.OPEN)
                .createdAt(LocalDateTime.of(2025, 1, 1, 10, 0)).build();
        Issue inProgress  = Issue.builder().id("I2").status(IssueStatus.IN_PROGRESS)
                .createdAt(LocalDateTime.of(2025, 1, 2, 10, 0)).build();
        Issue resolved    = Issue.builder().id("I3").status(IssueStatus.RESOLVED)
                .createdAt(LocalDateTime.of(2025, 1, 3, 10, 0)).build();
        Issue closed      = Issue.builder().id("I4").status(IssueStatus.CLOSED)
                .createdAt(LocalDateTime.of(2025, 1, 4, 10, 0)).build();

        when(issueRepository.findAll(any(Specification.class)))
                .thenReturn(List.of(openIssue, inProgress, resolved, closed));
        // No RESOLVED comment for these resolved/closed issues
        when(issueCommentRepository.findByIssueIdOrderByCreatedAtDescWithUser(any()))
                .thenReturn(List.of());

        ReportService.IssueMetrics result = reportService.getIssueMetrics(START, END);

        assertEquals(4L, result.totalIssues());
        assertEquals(2L, result.openIssues());
        assertEquals(2L, result.closedIssues());
        assertNull(result.averageResolutionHours());
    }

    @Test
    void getIssueMetrics_WithResolvedIssue_ShouldCalculateResolutionHours() {
        LocalDateTime issueCreatedAt = LocalDateTime.of(2025, 1, 10, 8, 0);
        LocalDateTime commentAt      = LocalDateTime.of(2025, 1, 10, 12, 0); // 4h later

        Issue resolved = Issue.builder()
                .id("I1")
                .status(IssueStatus.RESOLVED)
                .createdAt(issueCreatedAt)
                .build();

        IssueComment resolvedComment = IssueComment.builder()
                .issueId("I1")
                .status(IssueStatus.RESOLVED)
                .createdAt(commentAt)
                .build();

        when(issueRepository.findAll(any(Specification.class))).thenReturn(List.of(resolved));
        when(issueCommentRepository.findByIssueIdOrderByCreatedAtDescWithUser("I1"))
                .thenReturn(List.of(resolvedComment));

        ReportService.IssueMetrics result = reportService.getIssueMetrics(START, END);

        assertNotNull(result.averageResolutionHours());
        assertEquals(4.0, result.averageResolutionHours());
    }

    @Test
    void getIssueMetrics_WithResolvedIssueButNoResolvedComment_ShouldReturnNullResolution() {
        Issue resolved = Issue.builder()
                .id("I1")
                .status(IssueStatus.RESOLVED)
                .createdAt(LocalDateTime.of(2025, 1, 10, 8, 0))
                .build();

        IssueComment otherComment = IssueComment.builder()
                .issueId("I1")
                .status(IssueStatus.OPEN)
                .createdAt(LocalDateTime.of(2025, 1, 10, 9, 0))
                .build();

        when(issueRepository.findAll(any(Specification.class))).thenReturn(List.of(resolved));
        when(issueCommentRepository.findByIssueIdOrderByCreatedAtDescWithUser("I1"))
                .thenReturn(List.of(otherComment));

        ReportService.IssueMetrics result = reportService.getIssueMetrics(START, END);

        assertNull(result.averageResolutionHours());
    }

    // ═══════════════════════════════════════════════════════════════
    // getProductAnalytics
    // ═══════════════════════════════════════════════════════════════

    @Test
    void getProductAnalytics_WhenNoOrders_ShouldReturnEmptyAnalytics() {
        when(orderRepository.findAll(any(Specification.class))).thenReturn(List.of());
        when(productViewRepository.countByViewedAtBetween(any(), any())).thenReturn(0L);
        when(productViewRepository.countDistinctProductsBetween(any(), any())).thenReturn(0L);

        ReportService.ProductAnalytics result = reportService.getProductAnalytics(START, END);

        assertEquals(0L, result.totalProductsSold());
        assertEquals(0L, result.uniqueProductsSold());
        assertEquals(BigDecimal.ZERO, result.totalProductRevenue());
        assertTrue(result.topProductsByQuantity().isEmpty());
        assertTrue(result.topProductsByRevenue().isEmpty());
        assertTrue(result.salesByFamily().isEmpty());
        assertNull(result.conversionFunnel());
        assertEquals(0L, result.totalViews());
        assertEquals(0L, result.uniqueViewedProducts());
    }

    @Test
    void getProductAnalytics_ShouldCalculateTotals() {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USR001")
                .status(OrderStatus.PAYMENT_CONFIRMED)
                .createdAt(LocalDateTime.of(2025, 1, 10, 10, 0))
                .build();

        OrderProduct op1 = OrderProduct.builder()
                .id(UUID.randomUUID())
                .orderId("ORD001")
                .productId("PROD001")
                .quantity(3)
                .price(BigDecimal.TEN)
                .build();
        OrderProduct op2 = OrderProduct.builder()
                .id(UUID.randomUUID())
                .orderId("ORD001")
                .productId("PROD002")
                .quantity(2)
                .price(BigDecimal.valueOf(20))
                .build();

        FamilyProduct drop = FamilyProduct.builder().id("DROP001").name("Verano 2025").build();
        Product prod1 = Product.builder().id("PROD001").name("Camiseta").familyProduct(drop).build();
        Product prod2 = Product.builder().id("PROD002").name("Pantalón").familyProduct(drop).build();

        when(orderRepository.findAll(any(Specification.class))).thenReturn(List.of(order));
        when(orderProductRepository.findAll(any(Specification.class))).thenReturn(List.of(op1, op2));
        when(productRepository.findAllById(any(Iterable.class))).thenReturn(List.of(prod1, prod2));
        when(productViewRepository.countByViewedAtBetween(any(), any())).thenReturn(0L);
        when(productViewRepository.countDistinctProductsBetween(any(), any())).thenReturn(0L);

        ReportService.ProductAnalytics result = reportService.getProductAnalytics(START, END);

        assertEquals(5L, result.totalProductsSold());  // 3 + 2
        assertEquals(2L, result.uniqueProductsSold()); // 2 distinct products
        // totalRevenue: 3*10 + 2*20 = 30 + 40 = 70
        assertEquals(0, BigDecimal.valueOf(70).compareTo(result.totalProductRevenue()));
    }

    @Test
    void getProductAnalytics_ShouldGroupSalesByFamily() {
        Order order = Order.builder()
                .id("ORD001").customerId("USR001").status(OrderStatus.PAYMENT_CONFIRMED)
                .createdAt(LocalDateTime.of(2025, 1, 10, 10, 0)).build();

        OrderProduct op1 = OrderProduct.builder()
                .id(UUID.randomUUID()).orderId("ORD001").productId("P1")
                .quantity(2).price(BigDecimal.TEN).build();
        OrderProduct op2 = OrderProduct.builder()
                .id(UUID.randomUUID()).orderId("ORD001").productId("P2")
                .quantity(3).price(BigDecimal.valueOf(5)).build();

        FamilyProduct drop = FamilyProduct.builder().id("DROP1").name("Drop A").build();
        Product prod1 = Product.builder().id("P1").name("Item1").familyProduct(drop).build();
        Product prod2 = Product.builder().id("P2").name("Item2").familyProduct(drop).build();

        when(orderRepository.findAll(any(Specification.class))).thenReturn(List.of(order));
        when(orderProductRepository.findAll(any(Specification.class))).thenReturn(List.of(op1, op2));
        when(productRepository.findAllById(any(Iterable.class))).thenReturn(List.of(prod1, prod2));
        when(productViewRepository.countByViewedAtBetween(any(), any())).thenReturn(0L);
        when(productViewRepository.countDistinctProductsBetween(any(), any())).thenReturn(0L);

        ReportService.ProductAnalytics result = reportService.getProductAnalytics(START, END);

        assertEquals(1, result.salesByFamily().size());
        ReportService.FamilyProductSales family = result.salesByFamily().get(0);
        assertEquals("DROP1", family.familyId());
        assertEquals("Drop A", family.familyName());
        assertEquals(5L, family.quantity()); // 2 + 3
        assertEquals(0, BigDecimal.valueOf(35).compareTo(family.revenue())); // 2*10 + 3*5
    }

    @Test
    void getProductAnalytics_WithNullFamily_ShouldUseSinCategoria() {
        Order order = Order.builder()
                .id("ORD001").customerId("USR001").status(OrderStatus.PAYMENT_CONFIRMED)
                .createdAt(LocalDateTime.of(2025, 1, 10, 10, 0)).build();

        OrderProduct op1 = OrderProduct.builder()
                .id(UUID.randomUUID()).orderId("ORD001").productId("P1")
                .quantity(1).price(BigDecimal.TEN).build();

        Product prodNoFamily = Product.builder().id("P1").name("Item1").familyProduct(null).build();

        when(orderRepository.findAll(any(Specification.class))).thenReturn(List.of(order));
        when(orderProductRepository.findAll(any(Specification.class))).thenReturn(List.of(op1));
        when(productRepository.findAllById(any(Iterable.class))).thenReturn(List.of(prodNoFamily));
        when(productViewRepository.countByViewedAtBetween(any(), any())).thenReturn(0L);
        when(productViewRepository.countDistinctProductsBetween(any(), any())).thenReturn(0L);

        ReportService.ProductAnalytics result = reportService.getProductAnalytics(START, END);

        assertEquals(1, result.salesByFamily().size());
        ReportService.FamilyProductSales fam = result.salesByFamily().get(0);
        assertEquals("uncategorized", fam.familyId());
        assertEquals("Sin categoría", fam.familyName());
    }

    @Test
    void getProductAnalytics_WithProductViews_ShouldBuildConversionFunnel() {
        Order order = Order.builder()
                .id("ORD001").customerId("USR001").status(OrderStatus.PAYMENT_CONFIRMED)
                .createdAt(LocalDateTime.of(2025, 1, 10, 10, 0)).build();

        OrderProduct op1 = OrderProduct.builder()
                .id(UUID.randomUUID()).orderId("ORD001").productId("PROD001")
                .quantity(2).price(BigDecimal.TEN).build();

        Product prod = Product.builder().id("PROD001").name("Camiseta").build();

        when(orderRepository.findAll(any(Specification.class))).thenReturn(List.of(order));
        when(orderProductRepository.findAll(any(Specification.class))).thenReturn(List.of(op1));
        when(productRepository.findAllById(any(Iterable.class))).thenReturn(List.of(prod));
        when(productViewRepository.countByViewedAtBetween(any(), any())).thenReturn(100L);
        when(productViewRepository.countDistinctProductsBetween(any(), any())).thenReturn(1L);
        List<Object[]> viewCounts = new ArrayList<>();
        viewCounts.add(new Object[]{"PROD001", 50L});
        when(productViewRepository.countViewsByProduct(any(), any()))
                .thenReturn(viewCounts);

        ReportService.ProductAnalytics result = reportService.getProductAnalytics(START, END);

        assertNotNull(result.conversionFunnel());
        assertFalse(result.conversionFunnel().isEmpty());
        ReportService.ProductFunnel funnel = result.conversionFunnel().get(0);
        assertEquals("PROD001", funnel.productId());
        assertEquals("Camiseta", funnel.productName());
        assertEquals(50L, funnel.views());
        assertEquals(2L, funnel.purchases());
        // conversionRate = round(2/50 * 1000) / 10.0 = 4.0
        assertEquals(4.0, funnel.conversionRate());
    }

    // ═══════════════════════════════════════════════════════════════
    // getReportSummary
    // ═══════════════════════════════════════════════════════════════

    @Test
    void getReportSummary_ShouldReturnAllFourAnalytics() {
        // Minimal stubs for all 9 repositories so sub-methods return without NPE
        when(orderRepository.findAll(any(Specification.class))).thenReturn(List.of());
        when(userRepository.count()).thenReturn(0L);
        when(userRepository.count(any(Specification.class))).thenReturn(0L);
        when(userRepository.findAll(any(Specification.class))).thenReturn(List.of());
        when(userLoginHistoryRepository.countDistinctUsersBetween(any(), any())).thenReturn(0L);
        when(userLoginHistoryRepository.countLoginsBetween(any(), any())).thenReturn(0L);
        when(userLoginHistoryRepository.countActiveUsersByDay(any(), any())).thenReturn(List.of());
        when(issueRepository.findAll(any(Specification.class))).thenReturn(List.of());
        when(productViewRepository.countByViewedAtBetween(any(), any())).thenReturn(0L);
        when(productViewRepository.countDistinctProductsBetween(any(), any())).thenReturn(0L);

        ReportService.ReportSummary summary = reportService.getReportSummary(START, END);

        assertNotNull(summary.orders());
        assertNotNull(summary.users());
        assertNotNull(summary.issues());
        assertNotNull(summary.products());
    }
}
