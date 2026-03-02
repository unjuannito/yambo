package es.yambo_alco.web.service;

import es.yambo_alco.web.model.Activity;
import es.yambo_alco.web.model.Order;
import es.yambo_alco.web.model.Permission;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.OrderStatus;
import es.yambo_alco.web.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final FamilyProductRepository familyProductRepository;
    private final ActivityRepository activityRepository;
    private final IssueRepository issueRepository;

    public DashboardData getDashboardData(User user) {
        // Personal data - always included
        PersonalDashboardData personal = getPersonalData(user);

        // Admin data - only if user has admin permissions
        AdminDashboardData admin = null;
        if (hasAnyAdminPermission(user)) {
            admin = getAdminData(user);
        }

        return new DashboardData(personal, admin);
    }

    private PersonalDashboardData getPersonalData(User user) {
        // Get user's orders
        Specification<Order> spec = (root, query, cb) -> cb.equal(root.get("customerId"), user.getId());
        List<Order> myOrders = orderRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"));

        int totalOrders = myOrders.size();

        // Group orders by status
        Map<String, Long> ordersByStatus = myOrders.stream()
                .collect(Collectors.groupingBy(
                        order -> order.getStatus().name(),
                        Collectors.counting()));

        // Recent 5 orders
        List<Order> recentOrders = myOrders.stream()
                .limit(5)
                .toList();

        // Count user's issues
        Specification<es.yambo_alco.web.model.Issue> issueSpec = (root, query, cb) ->
                cb.equal(root.get("createdBy"), user.getId());
        long totalIssues = issueRepository.count(issueSpec);

        return new PersonalDashboardData(totalOrders, ordersByStatus, recentOrders, totalIssues);
    }

    private AdminDashboardData getAdminData(User user) {
        Long totalUsers = null;
        Long totalOrders = null;
        Long totalProjects = null;
        Long totalProducts = null;
        List<Activity> recentActivities = null;

        if (hasPermission(user, "user", "read")) {
            totalUsers = userRepository.count();
        }

        if (hasPermission(user, "order", "read")) {
            totalOrders = orderRepository.count();
        }

        if (hasPermission(user, "project", "read")) {
            totalProjects = projectRepository.count();
        }

        if (hasPermission(user, "family_product", "read")) {
            totalProducts = familyProductRepository.count();
        }

        if (hasPermission(user, "activity", "read")) {
            var pageable = PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "date"));
            recentActivities = activityRepository.findAll(pageable).getContent();
        }

        return new AdminDashboardData(totalUsers, totalOrders, totalProjects, totalProducts, recentActivities);
    }

    private boolean hasAnyAdminPermission(User user) {
        return hasPermission(user, "user", "read") ||
               hasPermission(user, "order", "read") ||
               hasPermission(user, "project", "read") ||
               hasPermission(user, "activity", "read") ||
               hasPermission(user, "family_product", "read");
    }

    private boolean hasPermission(User user, String resource, String action) {
        return user.getProfiles().stream()
                .flatMap(profile -> profile.getPermissions().stream())
                .anyMatch(permission ->
                        permission.getResource().getValue().equals(resource) &&
                        permission.getAction().getValue().equals(action));
    }

    // Data classes
    public record DashboardData(PersonalDashboardData personal, AdminDashboardData admin) {}

    public record PersonalDashboardData(
            int totalOrders,
            Map<String, Long> ordersByStatus,
            List<Order> recentOrders,
            long totalIssues
    ) {}

    public record AdminDashboardData(
            Long totalUsers,
            Long totalOrders,
            Long totalProjects,
            Long totalProducts,
            List<Activity> recentActivities
    ) {}
}
