package es.yambo_alco.web.service;

import es.yambo_alco.web.model.Issue;
import es.yambo_alco.web.model.IssueComment;
import es.yambo_alco.web.model.Order;
import es.yambo_alco.web.model.OrderProduct;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.IssueStatus;
import es.yambo_alco.web.model.enums.OrderStatus;
import es.yambo_alco.web.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
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
    // SUMMARY OVERVIEW
    // ========================

    public ReportSummary getReportSummary(LocalDate startDate, LocalDate endDate) {
        OrderAnalytics orders = getOrderAnalytics(startDate, endDate);
        UserEngagement users = getUserEngagement(startDate, endDate);
        IssueMetrics issues = getIssueMetrics(startDate, endDate);

        return new ReportSummary(orders, users, issues);
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

    public record ReportSummary(
            OrderAnalytics orders,
            UserEngagement users,
            IssueMetrics issues
    ) {}
}
