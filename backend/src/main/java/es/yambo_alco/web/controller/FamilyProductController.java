package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.FamilyProduct;
import es.yambo_alco.web.service.FamilyProductService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/family-products")
@RequiredArgsConstructor
public class FamilyProductController {

    private final FamilyProductService familyProductService;

    @PostMapping
    @PreAuthorize("@permissionCheck.hasPermission('family_product', 'create')")
    public ResponseEntity<FamilyProductResponse> createFamilyProduct(@Valid @RequestBody CreateFamilyProductRequest request) {
        FamilyProduct familyProduct = familyProductService.createFamilyProduct(
                request.getName(),
                request.getEndTms(),
                request.getProfileIds(),
                request.getProjectIds()
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
        Page<FamilyProduct> familyProducts = familyProductService.listFamilyProducts(name, active, profileId, pageable);
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
            request.getEndTms(),
            request.getProjectIds()
        );
        return ResponseEntity.ok(new FamilyProductResponse(familyProduct));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('family_product', 'delete')")
    public ResponseEntity<Void> deleteFamilyProduct(@PathVariable String id) {
        familyProductService.deleteFamilyProduct(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/profiles")
    @PreAuthorize("@permissionCheck.hasPermission('family_product', 'update')")
    public ResponseEntity<FamilyProductResponse> assignProfiles(
            @PathVariable String id,
            @Valid @RequestBody AssignProfilesRequest request) {
        FamilyProduct familyProduct = familyProductService.assignProfilesToFamily(id, request.getProfileIds());
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

    @Data
    public static class CreateFamilyProductRequest {
        @NotBlank(message = "Name is required")
        private String name;

        @NotNull(message = "End date is required")
        private LocalDateTime endTms;

        private Set<String> profileIds;

        private Set<String> projectIds;
    }

    @Data
    public static class UpdateFamilyProductRequest {
        private String name;
        private LocalDateTime endTms;
        private Set<String> projectIds;
    }

    @Data
    public static class AssignProfilesRequest {
        @NotEmpty(message = "Profile IDs cannot be empty")
        private Set<String> profileIds;
    }

    @Data
    public static class AssignProjectsRequest {
        @NotEmpty(message = "Project IDs cannot be empty")
        private Set<String> projectIds;
    }

    @Data
    public static class FamilyProductResponse {
        private String id;
        private String name;
        private LocalDateTime endTms;
        private Set<String> profileIds;
        private Set<String> projectIds;
        private boolean active;

        public FamilyProductResponse(FamilyProduct familyProduct) {
            this.id = familyProduct.getId();
            this.name = familyProduct.getName();
            this.endTms = familyProduct.getEndTms();
            this.profileIds = familyProduct.getProfiles() != null
                    ? familyProduct.getProfiles().stream()
                    .map(p -> p.getId())
                    .collect(Collectors.toSet())
                    : Set.of();
                this.projectIds = familyProduct.getProjects() != null
                    ? familyProduct.getProjects().stream()
                    .map(p -> p.getId())
                    .collect(Collectors.toSet())
                    : Set.of();
            this.active = familyProduct.getEndTms().isAfter(LocalDateTime.now());
        }
    }
}
