package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.Activity;
import es.yambo_alco.web.model.Order;
import es.yambo_alco.web.model.OrderProduct;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.ActivityStatus;
import es.yambo_alco.web.repository.ProductRepository;
import es.yambo_alco.web.repository.UserRepository;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.DashboardService;
import es.yambo_alco.web.service.DashboardService.AdminDashboardData;
import es.yambo_alco.web.service.DashboardService.PersonalDashboardData;
import es.yambo_alco.web.service.OrderService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final AuthService authService;
    private final OrderService orderService;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DashboardResponse> getDashboard() {
        User user = authService.getCurrentUser(true);
        var data = dashboardService.getDashboardData(user);

        PersonalDataResponse personal = mapPersonalData(data.personal());
        AdminDataResponse admin = data.admin() != null ? mapAdminData(data.admin()) : null;

        return ResponseEntity.ok(new DashboardResponse(personal, admin));
    }

    private PersonalDataResponse mapPersonalData(PersonalDashboardData data) {
        List<OrderSummaryResponse> recentOrders = data.recentOrders().stream()
                .map(order -> {
                    List<OrderProduct> products = orderService.getOrderProducts(order.getId());
                    return new OrderSummaryResponse(order, products, userRepository, productRepository, orderService);
                })
                .toList();

        return new PersonalDataResponse(
                data.totalOrders(),
                data.ordersByStatus(),
                recentOrders,
                data.totalIssues()
        );
    }

    private AdminDataResponse mapAdminData(AdminDashboardData data) {
        List<ActivitySummaryResponse> activities = null;
        if (data.recentActivities() != null) {
            activities = data.recentActivities().stream()
                    .map(ActivitySummaryResponse::new)
                    .toList();
        }

        return new AdminDataResponse(
                data.totalUsers(),
                data.totalOrders(),
                data.totalProjects(),
                data.totalProducts(),
                activities
        );
    }

    // Response DTOs
    @Data
    public static class DashboardResponse {
        private PersonalDataResponse personal;
        private AdminDataResponse admin;

        public DashboardResponse(PersonalDataResponse personal, AdminDataResponse admin) {
            this.personal = personal;
            this.admin = admin;
        }
    }

    @Data
    public static class PersonalDataResponse {
        private int totalOrders;
        private Map<String, Long> ordersByStatus;
        private List<OrderSummaryResponse> recentOrders;
        private long totalIssues;

        public PersonalDataResponse(int totalOrders, Map<String, Long> ordersByStatus,
                                    List<OrderSummaryResponse> recentOrders, long totalIssues) {
            this.totalOrders = totalOrders;
            this.ordersByStatus = ordersByStatus;
            this.recentOrders = recentOrders;
            this.totalIssues = totalIssues;
        }
    }

    @Data
    public static class AdminDataResponse {
        private Long totalUsers;
        private Long totalOrders;
        private Long totalProjects;
        private Long totalProducts;
        private List<ActivitySummaryResponse> recentActivities;

        public AdminDataResponse(Long totalUsers, Long totalOrders, Long totalProjects,
                                 Long totalProducts, List<ActivitySummaryResponse> recentActivities) {
            this.totalUsers = totalUsers;
            this.totalOrders = totalOrders;
            this.totalProjects = totalProjects;
            this.totalProducts = totalProducts;
            this.recentActivities = recentActivities;
        }
    }

    @Data
    public static class OrderSummaryResponse {
        private String id;
        private UserInfo user;
        private String status;
        private LocalDateTime createdAt;
        private LocalDateTime closedAt;
        private boolean hasOpenIssues;
        private String receiptFileId;
        private List<OrderProductSummary> products;

        public OrderSummaryResponse(Order order, List<OrderProduct> products,
                                    UserRepository userRepository, ProductRepository productRepository,
                                    OrderService orderService) {
            this.id = order.getId();
            this.status = order.getStatus().name();
            this.createdAt = order.getCreatedAt();
            this.closedAt = order.getClosedAt();
            this.hasOpenIssues = orderService.hasOpenIssues(order.getId());
            this.receiptFileId = order.getReceiptFileId();

            userRepository.findById(order.getCustomerId()).ifPresent(u -> {
                this.user = new UserInfo(u.getId(), u.getName(), u.getEmail());
            });

            String orderStatus = order.getStatus() != null ? order.getStatus().name() : null;
            this.products = products.stream()
                    .map(p -> new OrderProductSummary(p, productRepository, orderStatus))
                    .toList();
        }
    }

    @Data
    public static class OrderProductSummary {
        private String id;
        private String productId;
        private String productName;
        private Integer quantity;
        private BigDecimal price;
        private String status;

        public OrderProductSummary(OrderProduct op, ProductRepository productRepository, String orderStatus) {
            this.id = op.getId() != null ? op.getId().toString() : null;
            this.productId = op.getProductId();
            this.quantity = op.getQuantity();
            this.price = op.getPrice();
            this.status = orderStatus;

            productRepository.findById(op.getProductId()).ifPresent(product -> {
                this.productName = product.getName();
            });
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
    public static class ActivitySummaryResponse {
        private String id;
        private String name;
        private String description;
        private String image;
        private String location;
        private BigDecimal price;
        private LocalDateTime date;
        private LocalDateTime endDate;
        private StatusInfo status;
        private boolean isPublic;
        private ProjectSummary project;
        private ManagerSummary manager;

        public ActivitySummaryResponse(Activity activity) {
            this.id = activity.getId();
            this.name = activity.getName();
            this.description = activity.getDescription();
            this.image = activity.getImage();
            this.location = activity.getLocation();
            this.price = activity.getPrice();
            this.date = activity.getDate();
            this.endDate = activity.getEndDate();
            this.status = activity.getStatus() != null
                    ? new StatusInfo(activity.getStatus().name(), activity.getStatus().getLabel(), activity.getStatus().getColor())
                    : null;
            this.isPublic = activity.isPublic();
            if (activity.getProject() != null) {
                this.project = new ProjectSummary(activity.getProject().getId(), activity.getProject().getName());
            }
            if (activity.getManager() != null) {
                this.manager = new ManagerSummary(activity.getManager().getId(), activity.getManager().getName(), activity.getManager().getStaffPhoto());
            }
        }
    }

    @Data
    public static class StatusInfo {
        private String value;
        private String label;
        private String color;

        public StatusInfo(String value, String label, String color) {
            this.value = value;
            this.label = label;
            this.color = color;
        }
    }

    @Data
    public static class ProjectSummary {
        private String id;
        private String name;

        public ProjectSummary(String id, String name) {
            this.id = id;
            this.name = name;
        }
    }

    @Data
    public static class ManagerSummary {
        private String id;
        private String name;
        private String photo;

        public ManagerSummary(String id, String name, String photo) {
            this.id = id;
            this.name = name;
            this.photo = photo;
        }
    }
}
