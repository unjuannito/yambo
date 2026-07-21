package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.FamilyProduct;
import es.yambo_alco.web.model.FamilyProductRoleAccess;
import es.yambo_alco.web.model.FamilyProductWatcher;
import es.yambo_alco.web.model.enums.FamilyProductStatus;
import es.yambo_alco.web.model.enums.UserProjectGroupRole;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.BatchEmailService;
import es.yambo_alco.web.service.FamilyProductService;
import es.yambo_alco.web.service.FamilyProductService.FamilyProductUpdateResult;
import es.yambo_alco.web.service.FamilyProductWatcherService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import es.yambo_alco.web.model.enums.PermissionAction;
import es.yambo_alco.web.model.enums.PermissionResource;
import es.yambo_alco.web.util.PermissionCheckService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/family-products")
@RequiredArgsConstructor
public class FamilyProductController {

    private final FamilyProductService familyProductService;
    private final AuthService authService;
    private final BatchEmailService batchEmailService;
    private final PermissionCheckService permissionCheck;
    private final FamilyProductWatcherService familyProductWatcherService;

    @PostMapping
    @PreAuthorize("@permissionCheck.hasPermission('family_product', 'create')")
    public ResponseEntity<FamilyProductResponse> createFamilyProduct(@Valid @RequestBody CreateFamilyProductRequest request) {
        FamilyProduct familyProduct = familyProductService.createFamilyProduct(
                request.getName(),
                request.getStartTms(),
                request.getEndTms(),
                request.getProjectIds(),
                request.getRoleAccess()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(new FamilyProductResponse(familyProduct));
    }

    @GetMapping
    @PreAuthorize("@permissionCheck.hasPermission('family_product', 'read')")
    public ResponseEntity<Page<FamilyProductResponse>> listFamilyProducts(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String profileId,
            Pageable pageable) {
        boolean isFamilyAdmin = permissionCheck.hasPermission(PermissionResource.FAMILY_PRODUCT, PermissionAction.UPDATE);
        var user = authService.getCurrentUser(true);

        Page<FamilyProduct> familyProducts;
        if (isFamilyAdmin) {
            familyProducts = familyProductService.listFamilyProducts(name, active, profileId, null, pageable);
        } else {
            // Usar el nuevo filtro por proyecto+rol
            familyProducts = familyProductService.listAccessibleFamilyProducts(name, active, user, pageable);
        }
        Page<FamilyProductResponse> response = familyProducts.map(FamilyProductResponse::new);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('family_product', 'read')")
    public ResponseEntity<FamilyProductResponse> getFamilyProduct(@PathVariable String id) {
        FamilyProduct familyProduct = familyProductService.getFamilyProductById(id);
        return ResponseEntity.ok(new FamilyProductResponse(familyProduct));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('family_product', 'update')")
    public ResponseEntity<FamilyProductResponse> updateFamilyProduct(
            @PathVariable String id,
            @Valid @RequestBody UpdateFamilyProductRequest request) {
        FamilyProduct familyProduct = familyProductService.updateFamilyProduct(
                id,
                request.getName(),
                request.getStartTms(),
                request.getEndTms(),
                request.getProjectIds(),
                request.getRoleAccess()
        );
        return ResponseEntity.ok(new FamilyProductResponse(familyProduct));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('family_product', 'delete')")
    public ResponseEntity<Void> deleteFamilyProduct(@PathVariable String id) {
        familyProductService.deleteFamilyProduct(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/profile")
    @PreAuthorize("@permissionCheck.hasPermission('family_product', 'update')")
    public ResponseEntity<FamilyProductResponse> assignProfile(
            @PathVariable String id,
            @Valid @RequestBody AssignProfileRequest request) {
        FamilyProduct familyProduct = familyProductService.assignProfileToFamily(id, request.getProfileId());
        return ResponseEntity.ok(new FamilyProductResponse(familyProduct));
    }

    @PutMapping("/{id}/projects")
    @PreAuthorize("@permissionCheck.hasPermission('family_product', 'update')")
    public ResponseEntity<FamilyProductResponse> assignProjects(
            @PathVariable String id,
            @Valid @RequestBody AssignProjectsRequest request) {
        FamilyProduct familyProduct = familyProductService.assignProjectsToFamily(id, request.getProjectIds());
        return ResponseEntity.ok(new FamilyProductResponse(familyProduct));
    }

    @PutMapping("/{id}/role-access")
    @PreAuthorize("@permissionCheck.hasPermission('family_product', 'update')")
    public ResponseEntity<FamilyProductResponse> assignRoleAccess(
            @PathVariable String id,
            @Valid @RequestBody AssignRoleAccessRequest request) {
        FamilyProduct familyProduct = familyProductService.assignRoleAccess(id, request.getRoleAccess());
        return ResponseEntity.ok(new FamilyProductResponse(familyProduct));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("@permissionCheck.hasPermission('family_product', 'update')")
    public ResponseEntity<FamilyProductResponse> updateStatus(
            @PathVariable String id,
            @Valid @RequestBody UpdateFamilyProductStatusRequest request) {
        FamilyProductUpdateResult result = familyProductService.updateFamilyProductStatus(id, request.getStatus());

        if (!result.pendingEmails().isEmpty()) {
            String batchId = UUID.randomUUID().toString();
            String username = authService.getCurrentUser(true).getUsername();
            batchEmailService.processBatchOrderEmails(batchId, username, result.pendingEmails());
        }

        return ResponseEntity.ok(new FamilyProductResponse(result.familyProduct()));
    }

    @Data
    public static class CreateFamilyProductRequest {
        @NotBlank(message = "Name is required")
        private String name;

        @NotNull(message = "Start date is required")
        private LocalDateTime startTms;

        @NotNull(message = "End date is required")
        private LocalDateTime endTms;

        private Set<String> projectIds;

        private Set<FamilyProductRoleAccess> roleAccess;
    }

    @Data
    public static class UpdateFamilyProductRequest {
        private String name;
        private LocalDateTime startTms;
        private LocalDateTime endTms;
        private Set<String> projectIds;
        private Set<FamilyProductRoleAccess> roleAccess;
    }

    @Data
    public static class AssignProfileRequest {
        @NotBlank(message = "Profile ID cannot be empty")
        private String profileId;
    }

    @Data
    public static class AssignProjectsRequest {
        @NotEmpty(message = "Project IDs cannot be empty")
        private Set<String> projectIds;
    }

    @Data
    public static class AssignRoleAccessRequest {
        @NotEmpty(message = "Role access cannot be empty")
        private Set<FamilyProductRoleAccess> roleAccess;
    }

    @Data
    public static class UpdateFamilyProductStatusRequest {
        @NotNull(message = "Status is required")
        private FamilyProductStatus status;
    }

    @Data
    public static class FamilyProductResponse {
        private String id;
        private String name;
        private LocalDateTime startTms;
        private LocalDateTime endTms;
        private FamilyProductStatus status;
        private String profileId;
        private Set<String> projectIds;
        private Set<RoleAccessResponse> roleAccess;
        private boolean active;

        public FamilyProductResponse(FamilyProduct familyProduct) {
            this.id = familyProduct.getId();
            this.name = familyProduct.getName();
            this.startTms = familyProduct.getStartTms();
            this.endTms = familyProduct.getEndTms();
            this.status = familyProduct.getStatus();
            this.profileId = familyProduct.getProfile() != null
                    ? familyProduct.getProfile().getId()
                    : null;
            this.projectIds = familyProduct.getProjects() != null
                    ? familyProduct.getProjects().stream()
                    .map(p -> p.getId())
                    .collect(Collectors.toSet())
                    : Set.of();
            this.roleAccess = familyProduct.getRoleAccess() != null
                    ? familyProduct.getRoleAccess().stream()
                    .map(ra -> new RoleAccessResponse(ra.getProjectId(), ra.getRole()))
                    .collect(Collectors.toSet())
                    : Set.of();
            LocalDateTime now = LocalDateTime.now();
            this.active = familyProduct.getStatus() == FamilyProductStatus.OPEN
                    && (familyProduct.getStartTms() == null || !familyProduct.getStartTms().isAfter(now))
                    && familyProduct.getEndTms().isAfter(now);
        }
    }

    @Data
    @AllArgsConstructor
    public static class RoleAccessResponse {
        private String projectId;
        private UserProjectGroupRole role;
    }

    // ─── Watcher endpoints ────────────────────────────────────────────────────

    @GetMapping("/{id}/watchers")
    @PreAuthorize("@permissionCheck.hasPermission('family_product', 'update')")
    public ResponseEntity<List<DropWatcherResponse>> getDropWatchers(@PathVariable String id) {
        List<FamilyProductWatcher> watchers = familyProductWatcherService.getWatchers(id);
        return ResponseEntity.ok(watchers.stream().map(DropWatcherResponse::new).toList());
    }

    @PostMapping("/{id}/watchers")
    @PreAuthorize("@permissionCheck.hasPermission('family_product', 'update')")
    public ResponseEntity<DropWatcherResponse> addDropWatcher(
            @PathVariable String id,
            @Valid @RequestBody AddDropWatcherRequest request) {
        FamilyProductWatcher watcher = familyProductWatcherService.addWatcher(id, request.getEmail(), request.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(new DropWatcherResponse(watcher));
    }

    @DeleteMapping("/{id}/watchers")
    @PreAuthorize("@permissionCheck.hasPermission('family_product', 'update')")
    public ResponseEntity<Void> removeDropWatcher(
            @PathVariable String id,
            @Valid @RequestBody RemoveDropWatcherRequest request) {
        familyProductWatcherService.removeWatcher(id, request.getEmail());
        return ResponseEntity.noContent().build();
    }

    @Data
    public static class AddDropWatcherRequest {
        @NotBlank(message = "Email is required")
        private String email;
        private String userId;
    }

    @Data
    public static class RemoveDropWatcherRequest {
        @NotBlank(message = "Email is required")
        private String email;
    }

    @Data
    public static class DropWatcherResponse {
        private UUID id;
        private String familyProductId;
        private String email;
        private String userId;
        private String userName;
        private String createdAt;

        public DropWatcherResponse(FamilyProductWatcher watcher) {
            this.id = watcher.getId();
            this.familyProductId = watcher.getFamilyProductId();
            this.email = watcher.getEmail();
            this.userId = watcher.getUserId();
            this.userName = watcher.getUser() != null ? watcher.getUser().getName() : null;
            this.createdAt = watcher.getCreatedAt().toString();
        }
    }
}
