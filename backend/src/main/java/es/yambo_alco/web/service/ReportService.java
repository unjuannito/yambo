package es.yambo_alco.web.service;

import es.yambo_alco.web.model.*;
import es.yambo_alco.web.model.enums.IssueStatus;
import es.yambo_alco.web.model.enums.OrderStatus;
import es.yambo_alco.web.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final OrderRepository orderRepository;
    private final OrderProductRepository orderProductRepository;
    private final UserRepository userRepository;
    private final IssueRepository issueRepository;
    private final IssueCommentRepository issueCommentRepository;
    private final UserLoginHistoryRepository userLoginHistoryRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final ProductRepository productRepository;
    private final ProductViewRepository productViewRepository;

    // ========================
    // ORDER ANALYTICS
    // ========================

    public OrderAnalytics getOrderAnalytics(LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(LocalTime.MAX);

        // Get all orders in range
        Specification<Order> spec = (root, query, cb) ->
                cb.between(root.get("createdAt"), start, end);
        List<Order> orders = orderRepository.findAll(spec);

        // Total orders
        long totalOrders = orders.size();

        // Orders by status
        Map<String, Long> ordersByStatus = orders.stream()
                .collect(Collectors.groupingBy(
                        o -> o.getStatus().name(),
                        Collectors.counting()));

        // Orders over time (grouped by day)
        Map<String, Long> ordersOverTime = orders.stream()
                .collect(Collectors.groupingBy(
                        o -> o.getCreatedAt().toLocalDate().toString(),
                        TreeMap::new,
                        Collectors.counting()));

        // Revenue calculation
        BigDecimal totalRevenue = BigDecimal.ZERO;
        Map<String, BigDecimal> revenueOverTime = new TreeMap<>();

        for (Order order : orders) {
            if (order.getStatus() == OrderStatus.CANCELED) continue;

            List<OrderProduct> products = orderProductRepository.findAll(
                    (root, query, cb) -> cb.equal(root.get("orderId"), order.getId()));

            BigDecimal orderTotal = products.stream()
                    .map(op -> op.getPrice().multiply(new BigDecimal(op.getQuantity())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            totalRevenue = totalRevenue.add(orderTotal);

            String dateKey = order.getCreatedAt().toLocalDate().toString();
            revenueOverTime.merge(dateKey, orderTotal, BigDecimal::add);
        }

        // Average order value
        long nonCanceledOrders = orders.stream()
                .filter(o -> o.getStatus() != OrderStatus.CANCELED)
                .count();
        BigDecimal averageOrderValue = nonCanceledOrders > 0
                ? totalRevenue.divide(new BigDecimal(nonCanceledOrders), 2, java.math.RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        // Average fulfillment time (for closed orders)
        OptionalDouble avgFulfillmentDays = orders.stream()
                .filter(o -> o.getStatus() == OrderStatus.CLOSED && o.getClosedAt() != null)
                .mapToLong(o -> ChronoUnit.HOURS.between(o.getCreatedAt(), o.getClosedAt()))
                .average();

        Double averageFulfillmentHours = avgFulfillmentDays.isPresent()
                ? Math.round(avgFulfillmentDays.getAsDouble() * 10.0) / 10.0
                : null;

        return new OrderAnalytics(
                totalOrders,
                totalRevenue,
                averageOrderValue,
                averageFulfillmentHours,
                ordersByStatus,
                toTimeSeriesList(ordersOverTime),
                toTimeSeriesDecimalList(revenueOverTime)
        );
    }

    // ========================
    // USER ENGAGEMENT
    // ========================

    public UserEngagement getUserEngagement(LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(LocalTime.MAX);

        // Total users
        long totalUsers = userRepository.count();

        // New registrations in period
        Specification<User> regSpec = (root, query, cb) ->
                cb.between(root.get("createdAt"), start, end);
        long newRegistrations = userRepository.count(regSpec);

        // Registrations over time
        List<User> newUsers = userRepository.findAll(regSpec);
        Map<String, Long> registrationsOverTime = newUsers.stream()
                .filter(u -> u.getCreatedAt() != null)
                .collect(Collectors.groupingBy(
                        u -> u.getCreatedAt().toLocalDate().toString(),
                        TreeMap::new,
                        Collectors.counting()));

        // Active users (distinct logins in period)
        long activeUsers = userLoginHistoryRepository.countDistinctUsersBetween(start, end);

        // Total logins in period
        long totalLogins = userLoginHistoryRepository.countLoginsBetween(start, end);

        // Active users over time
        List<Object[]> activeByDay = userLoginHistoryRepository.countActiveUsersByDay(start, end);
        List<TimeSeriesPoint> activeUsersOverTime = activeByDay.stream()
                .map(row -> new TimeSeriesPoint(row[0].toString(), ((Number) row[1]).longValue()))
                .toList();

        // Engagement rate
        double engagementRate = totalUsers > 0
                ? Math.round((double) activeUsers / totalUsers * 1000.0) / 10.0
                : 0.0;

        return new UserEngagement(
                totalUsers,
                newRegistrations,
                activeUsers,
                totalLogins,
                engagementRate,
                toTimeSeriesList(registrationsOverTime),
                activeUsersOverTime
        );
    }

    // ========================
    // ISSUE METRICS
    // ========================

    public IssueMetrics getIssueMetrics(LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(LocalTime.MAX);

        // Issues in period
        Specification<Issue> spec = (root, query, cb) ->
                cb.between(root.get("createdAt"), start, end);
        List<Issue> issues = issueRepository.findAll(spec);

        long totalIssues = issues.size();

        // Issues by status
        Map<String, Long> issuesByStatus = issues.stream()
                .collect(Collectors.groupingBy(
                        i -> i.getStatus().name(),
                        Collectors.counting()));

        // Issues over time
        Map<String, Long> issuesOverTime = issues.stream()
                .collect(Collectors.groupingBy(
                        i -> i.getCreatedAt().toLocalDate().toString(),
                        TreeMap::new,
                        Collectors.counting()));

        // Average resolution time (for resolved/closed issues)
        List<Issue> resolvedIssues = issues.stream()
                .filter(i -> i.getStatus() == IssueStatus.RESOLVED || i.getStatus() == IssueStatus.CLOSED)
                .toList();

        Double averageResolutionHours = null;
        if (!resolvedIssues.isEmpty()) {
            double totalHours = 0;
            int count = 0;
            for (Issue issue : resolvedIssues) {
                // Find first comment with RESOLVED status to get resolution time
                List<IssueComment> comments = issueCommentRepository
                        .findByIssueIdOrderByCreatedAtDescWithUser(issue.getId());
                Optional<IssueComment> resolvedComment = comments.stream()
                        .filter(c -> c.getStatus() == IssueStatus.RESOLVED)
                        .min(Comparator.comparing(IssueComment::getCreatedAt));

                if (resolvedComment.isPresent()) {
                    long hours = ChronoUnit.HOURS.between(issue.getCreatedAt(), resolvedComment.get().getCreatedAt());
                    totalHours += hours;
                    count++;
                }
            }
            if (count > 0) {
                averageResolutionHours = Math.round(totalHours / count * 10.0) / 10.0;
            }
        }

        // Open vs resolved ratio
        long openCount = issues.stream()
                .filter(i -> i.getStatus() == IssueStatus.OPEN
                        || i.getStatus() == IssueStatus.IN_PROGRESS
                        || i.getStatus() == IssueStatus.REOPENED)
                .count();
        long closedCount = issues.stream()
                .filter(i -> i.getStatus() == IssueStatus.RESOLVED || i.getStatus() == IssueStatus.CLOSED)
                .count();

        return new IssueMetrics(
                totalIssues,
                openCount,
                closedCount,
                averageResolutionHours,
                issuesByStatus,
                toTimeSeriesList(issuesOverTime)
        );
    }

    // ========================
    // PRODUCT ANALYTICS
    // ========================

    public ProductAnalytics getProductAnalytics(LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(LocalTime.MAX);

        // Get all orders in range (non-canceled)
        Specification<Order> orderSpec = (root, query, cb) ->
                cb.and(
                        cb.between(root.get("createdAt"), start, end),
                        cb.notEqual(root.get("status"), OrderStatus.CANCELED)
                );
        List<Order> orders = orderRepository.findAll(orderSpec);
        Set<String> orderIds = orders.stream().map(Order::getId).collect(Collectors.toSet());

        if (orderIds.isEmpty()) {
            return emptyProductAnalytics(start, end);
        }

        // Get all order products for those orders
        Specification<OrderProduct> opSpec = (root, query, cb) ->
                root.get("orderId").in(orderIds);
        List<OrderProduct> orderProducts = orderProductRepository.findAll(opSpec);

        // Total products sold (sum of quantities)
        long totalProductsSold = orderProducts.stream()
                .mapToLong(OrderProduct::getQuantity)
                .sum();

        // Unique products sold
        Set<String> uniqueProductIds = orderProducts.stream()
                .map(OrderProduct::getProductId)
                .collect(Collectors.toSet());
        long uniqueProductsSold = uniqueProductIds.size();

        // Load product details for names and family info
        Map<String, Product> productMap = productRepository.findAllById(uniqueProductIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));

        // Total revenue from product sales
        BigDecimal totalProductRevenue = orderProducts.stream()
                .map(op -> op.getPrice().multiply(new BigDecimal(op.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Group by product: quantity and revenue
        Map<String, long[]> productStats = new HashMap<>(); // [quantity, revenueX100]
        Map<String, BigDecimal> productRevenues = new HashMap<>();
        for (OrderProduct op : orderProducts) {
            String pid = op.getProductId();
            productStats.computeIfAbsent(pid, k -> new long[1]);
            productStats.get(pid)[0] += op.getQuantity();
            BigDecimal rev = op.getPrice().multiply(new BigDecimal(op.getQuantity()));
            productRevenues.merge(pid, rev, BigDecimal::add);
        }

        // Top 10 by quantity
        List<ProductRanking> topByQuantity = productStats.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue()[0], a.getValue()[0]))
                .limit(10)
                .map(e -> {
                    Product p = productMap.get(e.getKey());
                    String name = p != null ? p.getName() : e.getKey();
                    return new ProductRanking(e.getKey(), name, e.getValue()[0],
                            productRevenues.getOrDefault(e.getKey(), BigDecimal.ZERO));
                })
                .toList();

        // Top 10 by revenue
        List<ProductRanking> topByRevenue = productRevenues.entrySet().stream()
                .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                .limit(10)
                .map(e -> {
                    Product p = productMap.get(e.getKey());
                    String name = p != null ? p.getName() : e.getKey();
                    long qty = productStats.containsKey(e.getKey()) ? productStats.get(e.getKey())[0] : 0;
                    return new ProductRanking(e.getKey(), name, qty, e.getValue());
                })
                .toList();

        // Sales by family
        Map<String, long[]> familyQuantities = new HashMap<>();
        Map<String, BigDecimal> familyRevenues = new HashMap<>();
        Map<String, String> familyNames = new HashMap<>();
        for (OrderProduct op : orderProducts) {
            Product p = productMap.get(op.getProductId());
            String famId = "uncategorized";
            String famName = "Sin categoría";
            if (p != null && p.getFamilyProduct() != null) {
                famId = p.getFamilyProduct().getId();
                famName = p.getFamilyProduct().getName();
            }
            familyNames.putIfAbsent(famId, famName);
            familyQuantities.computeIfAbsent(famId, k -> new long[1]);
            familyQuantities.get(famId)[0] += op.getQuantity();
            BigDecimal rev = op.getPrice().multiply(new BigDecimal(op.getQuantity()));
            familyRevenues.merge(famId, rev, BigDecimal::add);
        }

        List<FamilyProductSales> salesByFamily = familyQuantities.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue()[0], a.getValue()[0]))
                .map(e -> new FamilyProductSales(
                        e.getKey(),
                        familyNames.getOrDefault(e.getKey(), e.getKey()),
                        e.getValue()[0],
                        familyRevenues.getOrDefault(e.getKey(), BigDecimal.ZERO)
                ))
                .toList();

        // Product sales over time (by order's createdAt date)
        Map<String, Order> orderMap = orders.stream()
                .collect(Collectors.toMap(Order::getId, o -> o));

        Map<String, Long> salesOverTime = new TreeMap<>();
        Map<String, BigDecimal> revenueOverTime = new TreeMap<>();
        for (OrderProduct op : orderProducts) {
            Order order = orderMap.get(op.getOrderId());
            if (order == null) continue;
            String dateKey = order.getCreatedAt().toLocalDate().toString();
            salesOverTime.merge(dateKey, (long) op.getQuantity(), Long::sum);
            BigDecimal rev = op.getPrice().multiply(new BigDecimal(op.getQuantity()));
            revenueOverTime.merge(dateKey, rev, BigDecimal::add);
        }

        // Products by OrderProduct status
        Map<String, Long> productsByStatus = orderProducts.stream()
                .collect(Collectors.groupingBy(
                        op -> op.getStatus().name(),
                        Collectors.counting()));

        // Conversion funnel using product views
        long totalViews = productViewRepository.countByViewedAtBetween(start, end);
        long uniqueViewedProducts = productViewRepository.countDistinctProductsBetween(start, end);

        List<ProductFunnel> conversionFunnel = null;
        if (totalViews > 0) {
            List<Object[]> viewCounts = productViewRepository.countViewsByProduct(start, end);
            Map<String, Long> viewsByProduct = viewCounts.stream()
                    .collect(Collectors.toMap(
                            row -> (String) row[0],
                            row -> ((Number) row[1]).longValue()));

            conversionFunnel = uniqueProductIds.stream()
                    .map(pid -> {
                        Product p = productMap.get(pid);
                        String name = p != null ? p.getName() : pid;
                        long views = viewsByProduct.getOrDefault(pid, 0L);
                        long purchases = productStats.containsKey(pid) ? productStats.get(pid)[0] : 0;
                        double rate = views > 0 ? Math.round((double) purchases / views * 1000.0) / 10.0 : 0.0;
                        return new ProductFunnel(pid, name, views, purchases, rate);
                    })
                    .filter(f -> f.views() > 0 || f.purchases() > 0)
                    .sorted((a, b) -> Long.compare(b.purchases(), a.purchases()))
                    .limit(20)
                    .toList();
        }

        return new ProductAnalytics(
                totalProductsSold,
                uniqueProductsSold,
                totalProductRevenue,
                topByQuantity,
                topByRevenue,
                salesByFamily,
                toTimeSeriesList(salesOverTime),
                toTimeSeriesDecimalList(revenueOverTime),
                productsByStatus,
                totalViews,
                uniqueViewedProducts,
                conversionFunnel
        );
    }

    private ProductAnalytics emptyProductAnalytics(LocalDateTime start, LocalDateTime end) {
        long totalViews = productViewRepository.countByViewedAtBetween(start, end);
        long uniqueViewedProducts = productViewRepository.countDistinctProductsBetween(start, end);
        return new ProductAnalytics(
                0, 0, BigDecimal.ZERO,
                List.of(), List.of(), List.of(),
                List.of(), List.of(),
                Map.of(),
                totalViews, uniqueViewedProducts, null
        );
    }

    // ========================
    // SUMMARY OVERVIEW
    // ========================

    public ReportSummary getReportSummary(LocalDate startDate, LocalDate endDate) {
        OrderAnalytics orders = getOrderAnalytics(startDate, endDate);
        UserEngagement users = getUserEngagement(startDate, endDate);
        IssueMetrics issues = getIssueMetrics(startDate, endDate);
        ProductAnalytics products = getProductAnalytics(startDate, endDate);

        return new ReportSummary(orders, users, issues, products);
    }

    // ========================
    // HELPER METHODS
    // ========================

    private List<TimeSeriesPoint> toTimeSeriesList(Map<String, Long> data) {
        return data.entrySet().stream()
                .map(e -> new TimeSeriesPoint(e.getKey(), e.getValue()))
                .toList();
    }

    private List<TimeSeriesDecimalPoint> toTimeSeriesDecimalList(Map<String, BigDecimal> data) {
        return data.entrySet().stream()
                .map(e -> new TimeSeriesDecimalPoint(e.getKey(), e.getValue()))
                .toList();
    }

    // ========================
    // DATA RECORDS
    // ========================

    public record TimeSeriesPoint(String date, long value) {}
    public record TimeSeriesDecimalPoint(String date, BigDecimal value) {}

    public record OrderAnalytics(
            long totalOrders,
            BigDecimal totalRevenue,
            BigDecimal averageOrderValue,
            Double averageFulfillmentHours,
            Map<String, Long> ordersByStatus,
            List<TimeSeriesPoint> ordersOverTime,
            List<TimeSeriesDecimalPoint> revenueOverTime
    ) {}

    public record UserEngagement(
            long totalUsers,
            long newRegistrations,
            long activeUsers,
            long totalLogins,
            double engagementRate,
            List<TimeSeriesPoint> registrationsOverTime,
            List<TimeSeriesPoint> activeUsersOverTime
    ) {}

    public record IssueMetrics(
            long totalIssues,
            long openIssues,
            long closedIssues,
            Double averageResolutionHours,
            Map<String, Long> issuesByStatus,
            List<TimeSeriesPoint> issuesOverTime
    ) {}

    public record ProductRanking(
            String productId,
            String productName,
            long quantity,
            BigDecimal revenue
    ) {}

    public record FamilyProductSales(
            String familyId,
            String familyName,
            long quantity,
            BigDecimal revenue
    ) {}

    public record ProductFunnel(
            String productId,
            String productName,
            long views,
            long purchases,
            double conversionRate
    ) {}

    public record ProductAnalytics(
            long totalProductsSold,
            long uniqueProductsSold,
            BigDecimal totalProductRevenue,
            List<ProductRanking> topProductsByQuantity,
            List<ProductRanking> topProductsByRevenue,
            List<FamilyProductSales> salesByFamily,
            List<TimeSeriesPoint> productSalesOverTime,
            List<TimeSeriesDecimalPoint> productRevenueOverTime,
            Map<String, Long> productsByStatus,
            Long totalViews,
            Long uniqueViewedProducts,
            List<ProductFunnel> conversionFunnel
    ) {}

    public record ReportSummary(
            OrderAnalytics orders,
            UserEngagement users,
            IssueMetrics issues,
            ProductAnalytics products
    ) {}
}
