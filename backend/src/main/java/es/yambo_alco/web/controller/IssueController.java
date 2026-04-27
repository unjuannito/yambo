package es.yambo_alco.web.controller;

import es.yambo_alco.web.exception.ForbiddenException;
import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.model.Issue;
import es.yambo_alco.web.model.IssueComment;
import es.yambo_alco.web.model.IssueWatcher;
import es.yambo_alco.web.model.OrderProduct;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.IssueStatus;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.IssueService;
import es.yambo_alco.web.service.IssueWatcherService;
import es.yambo_alco.web.service.OrderService;
import es.yambo_alco.web.util.PermissionCheckService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/issues")
@RequiredArgsConstructor
public class IssueController {

    private final IssueService issueService;
    private final OrderService orderService;
    private final AuthService authService;
    private final PermissionCheckService permissionCheckService;
    private final IssueWatcherService issueWatcherService;

    @PostMapping
    @PreAuthorize("@permissionCheck.hasPermission('issue', 'create')")
    public ResponseEntity<IssueResponse> createIssue(@Valid @RequestBody CreateIssueRequest request) {
        User currentUser = authService.getCurrentUser(true);

        List<UUID> orderedProductIds = request.resolveOrderedProductIds();

        Issue issue = issueService.createIssue(
                orderedProductIds,
                request.getTitle(),
                request.getDescription(),
                currentUser.getId());

        List<OrderProduct> relatedProducts = issueService.getIssueProductsByIssueId(issue.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(new IssueResponse(issue, relatedProducts));
    }

    @GetMapping("/{issueId}")
    @PreAuthorize("@permissionCheck.hasPermission('issue', 'read')")
    public ResponseEntity<IssueDetailResponse> getIssue(@PathVariable String issueId) {
        Issue issue = issueService.getIssueWithComments(issueId);
        verifyAccessToIssue(issue);

        List<OrderProduct> relatedProducts = issueService.getIssueProductsByIssueId(issueId);

        List<IssueComment> comments = issueService.getIssueComments(issueId);

        return ResponseEntity.ok(new IssueDetailResponse(issue, comments, relatedProducts));
    }

    @GetMapping
    @PreAuthorize("@permissionCheck.hasPermission('issue', 'read')")
    public ResponseEntity<Page<IssueListResponse>> listIssues(
            @RequestParam(required = false) String issueId,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) List<IssueStatus> status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            Pageable pageable) {
        Page<Issue> issues = issueService.listIssues(issueId, title, userId, status, startDate, endDate, pageable);
        Page<IssueListResponse> response = issues.map(issue -> {
            List<OrderProduct> relatedProducts = issueService.getIssueProductsByIssueId(issue.getId());
            return new IssueListResponse(issue, relatedProducts);
        });
        return ResponseEntity.ok(response);
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<IssueListResponse>> getMyIssues(
            @RequestParam(required = false) String title,
            @RequestParam(required = false) List<IssueStatus> status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            Pageable pageable) {
        User currentUser = authService.getCurrentUser(true);
        Page<Issue> issues = issueService.listIssues(null, title, currentUser.getId(), status, startDate, endDate, pageable);
        Page<IssueListResponse> response = issues.map(issue -> {
            List<OrderProduct> relatedProducts = issueService.getIssueProductsByIssueId(issue.getId());
            return new IssueListResponse(issue, relatedProducts);
        });
        return ResponseEntity.ok(response);
    }

    @GetMapping("/order/{orderId}")
    @PreAuthorize("@permissionCheck.hasPermission('issue', 'read')")
    public ResponseEntity<List<IssueResponse>> getIssuesByOrder(@PathVariable String orderId) {
        orderService.getOrderById(orderId);

        List<Issue> issues = issueService.getIssuesByOrderId(orderId);
        List<IssueResponse> response = issues.stream()
                .map(issue -> new IssueResponse(issue, issueService.getIssueProductsByIssueId(issue.getId())))
                .toList();

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{issueId}/comments")
    @PreAuthorize("@permissionCheck.hasPermission('issue', 'comment')")
    public ResponseEntity<IssueCommentResponse> addComment(
            @PathVariable String issueId,
            @Valid @RequestBody AddCommentRequest request) {
        User currentUser = authService.getCurrentUser(true);

        Issue issue = issueService.getIssueWithComments(issueId);
        verifyAccessToIssue(issue);

        if (request.getStatus() != null && !permissionCheckService.hasPermission("issue", "update")) {
            throw new ForbiddenException("You don't have permission to update issue status");
        }

        IssueComment comment = issueService.addComment(issueId, request.getText(), currentUser.getId(),
                request.getStatus());

        return ResponseEntity.status(HttpStatus.CREATED).body(new IssueCommentResponse(comment));
    }

    @PutMapping("/{issueId}/products")
    @PreAuthorize("@permissionCheck.hasPermission('issue', 'update')")
    public ResponseEntity<IssueDetailResponse> updateIssueProducts(
            @PathVariable String issueId,
            @Valid @RequestBody UpdateIssueProductsRequest request) {
        Issue issue = issueService.updateIssueProducts(issueId, request.getOrderedProductIds());
        List<OrderProduct> relatedProducts = issueService.getIssueProductsByIssueId(issue.getId());
        List<IssueComment> comments = issueService.getIssueComments(issue.getId());
        return ResponseEntity.ok(new IssueDetailResponse(issue, comments, relatedProducts));
    }

    private void verifyAccessToIssue(Issue issue) {
        authService.getCurrentUser(true);
    }

    @Data
    public static class CreateIssueRequest {
        private List<UUID> orderedProductIds;

        @NotBlank(message = "Title cannot be blank")
        private String title;

        @NotBlank(message = "Description cannot be blank")
        private String description;

        public List<UUID> resolveOrderedProductIds() {
            if (orderedProductIds == null || orderedProductIds.stream().allMatch(id -> id == null)) {
                throw new BadRequestException("At least one ordered product ID is required");
            }
            return orderedProductIds.stream().filter(id -> id != null).distinct().toList();
        }
    }

    @Data
    public static class AddCommentRequest {
        private String text;
        private IssueStatus status;
    }

    @Data
    public static class UpdateIssueProductsRequest {
        private List<UUID> orderedProductIds;
    }
    @Data
    public static class IssueResponse {
        private String id;
        private List<UUID> orderedProductIds;
        private String title;
        private String description;
        private IssueStatus status;
        private String createdBy;
        private String createdAt;
        private String updatedAt;

        public IssueResponse(Issue issue, List<OrderProduct> relatedProducts) {
            this.id = issue.getId();
            this.orderedProductIds = relatedProducts.stream().map(OrderProduct::getId).toList();
            this.title = issue.getTitle();
            this.description = issue.getDescription();
            this.status = issue.getStatus();
            this.createdBy = issue.getCreatedBy();
            this.createdAt = issue.getCreatedAt().toString();
            this.updatedAt = issue.getUpdatedAt().toString();
        }
    }

    @Data
    public static class IssueDetailResponse {
        private String id;
        private List<UUID> orderedProductIds;
        private String title;
        private String description;
        private IssueStatus status;
        private String createdBy;
        private String createdAt;
        private String updatedAt;
        private List<IssueCommentResponse> comments;
        private List<RelatedProductResponse> relatedProducts;

        public IssueDetailResponse(Issue issue, List<IssueComment> comments, List<OrderProduct> relatedProducts) {
            this.id = issue.getId();
            this.orderedProductIds = relatedProducts.stream().map(OrderProduct::getId).toList();
            this.title = issue.getTitle();
            this.description = issue.getDescription();
            this.status = issue.getStatus();
            this.createdBy = issue.getCreatedBy();
            this.createdAt = issue.getCreatedAt().toString();
            this.updatedAt = issue.getUpdatedAt().toString();
            this.comments = comments.stream()
                    .map(IssueCommentResponse::new)
                    .toList();
            this.relatedProducts = relatedProducts.stream()
                    .map(RelatedProductResponse::new)
                    .toList();
        }
    }

    @Data
    public static class RelatedProductResponse {
        private UUID orderedProductId;
        private String productId;
        private String productName;
        private String familyProductName;
        private Integer quantity;
        private String unitPrice;
        private String configuration;

        public RelatedProductResponse(OrderProduct orderProduct) {
            this.orderedProductId = orderProduct.getId();
            this.productId = orderProduct.getProductId();
            this.productName = orderProduct.getProduct() != null ? orderProduct.getProduct().getName() : null;
            this.familyProductName = orderProduct.getProduct() != null
                    && orderProduct.getProduct().getFamilyProduct() != null
                            ? orderProduct.getProduct().getFamilyProduct().getName()
                            : null;
            this.quantity = orderProduct.getQuantity();
            this.unitPrice = orderProduct.getPrice() != null ? orderProduct.getPrice().toString() : null;
            this.configuration = orderProduct.getConfiguration();
        }
    }

    @Data
    public static class IssueCommentResponse {
        private UUID id;
        private String issueId;
        private String userId;
        private String userName;
        private IssueStatus status;
        private String text;
        private String createdAt;

        public IssueCommentResponse(IssueComment comment) {
            this.id = comment.getId();
            this.issueId = comment.getIssueId();
            this.userId = comment.getUserId();
            this.userName = comment.getUser() != null ? comment.getUser().getName() : comment.getUserId();
            this.status = comment.getStatus();
            this.text = comment.getText();
            this.createdAt = comment.getCreatedAt().toString();
        }
    }

    @Data
    public static class IssueListResponse {
        private String id;
        private List<UUID> orderedProductIds;
        private String title;
        private String description;
        private IssueStatus status;
        private String createdBy;
        private String createdAt;
        private String updatedAt;
        private String orderId;
        private String productName;
        private String customerName;

        public IssueListResponse(Issue issue, List<OrderProduct> relatedProducts) {
            this.id = issue.getId();
            this.orderedProductIds = relatedProducts.stream().map(OrderProduct::getId).toList();
            this.title = issue.getTitle();
            this.description = issue.getDescription();
            this.status = issue.getStatus();
            this.createdBy = issue.getCreatedBy();
            this.createdAt = issue.getCreatedAt().toString();
            this.updatedAt = issue.getUpdatedAt().toString();

            if (!relatedProducts.isEmpty()) {
                OrderProduct firstProduct = relatedProducts.get(0);
                this.orderId = firstProduct.getOrderId();
                this.productName = firstProduct.getProduct() != null
                        ? firstProduct.getProduct().getName()
                        : null;
                if (firstProduct.getOrder() != null && firstProduct.getOrder().getCustomerId() != null) {
                    this.customerName = firstProduct.getOrder().getCustomerId();
                }
            }

            if (issue.getCreatedByUser() != null) {
                this.customerName = issue.getCreatedByUser().getName();
            }
        }
    }

    // ─── Watcher endpoints ────────────────────────────────────────────────────

    @GetMapping("/{issueId}/watchers")
    @PreAuthorize("@permissionCheck.hasPermission('issue', 'update')")
    public ResponseEntity<List<WatcherResponse>> getWatchers(@PathVariable String issueId) {
        List<IssueWatcher> watchers = issueWatcherService.getWatchers(issueId);
        return ResponseEntity.ok(watchers.stream().map(WatcherResponse::new).toList());
    }

    @PostMapping("/{issueId}/watchers")
    @PreAuthorize("@permissionCheck.hasPermission('issue', 'update')")
    public ResponseEntity<WatcherResponse> addWatcher(
            @PathVariable String issueId,
            @Valid @RequestBody AddWatcherRequest request) {
        IssueWatcher watcher = issueWatcherService.addWatcher(issueId, request.getEmail(), request.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(new WatcherResponse(watcher));
    }

    @DeleteMapping("/{issueId}/watchers")
    @PreAuthorize("@permissionCheck.hasPermission('issue', 'update')")
    public ResponseEntity<Void> removeWatcher(
            @PathVariable String issueId,
            @Valid @RequestBody RemoveWatcherRequest request) {
        issueWatcherService.removeWatcher(issueId, request.getEmail());
        return ResponseEntity.noContent().build();
    }

    @Data
    public static class AddWatcherRequest {
        @NotBlank(message = "Email is required")
        private String email;
        private String userId;
    }

    @Data
    public static class RemoveWatcherRequest {
        @NotBlank(message = "Email is required")
        private String email;
    }

    @Data
    public static class WatcherResponse {
        private UUID id;
        private String issueId;
        private String email;
        private String userId;
        private String userName;
        private String createdAt;

        public WatcherResponse(IssueWatcher watcher) {
            this.id = watcher.getId();
            this.issueId = watcher.getIssueId();
            this.email = watcher.getEmail();
            this.userId = watcher.getUserId();
            this.userName = watcher.getUser() != null ? watcher.getUser().getName() : null;
            this.createdAt = watcher.getCreatedAt().toString();
        }
    }
}
