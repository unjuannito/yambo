package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.SeoMetadata;
import es.yambo_alco.web.model.enums.SeoEntityType;
import es.yambo_alco.web.service.SeoMetadataService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/admin/seo")
@RequiredArgsConstructor
public class SeoMetadataController {

    private final SeoMetadataService seoMetadataService;

    // ── List (paginated, optionally filtered by entityType) ────

    @GetMapping
    @PreAuthorize("@permissionCheck.hasPermission('seo_metadata', 'read')")
    public ResponseEntity<Page<SeoMetadataResponse>> list(
            @RequestParam(required = false) String entityType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "updatedAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String direction) {

        Sort sort = Sort.by(Sort.Direction.fromString(direction), sortBy);
        PageRequest pageable = PageRequest.of(page, size, sort);

        Page<SeoMetadata> result;
        if (entityType != null && !entityType.isBlank()) {
            SeoEntityType type = SeoEntityType.valueOf(entityType.toUpperCase());
            result = seoMetadataService.listByEntityType(type, pageable);
        } else {
            result = seoMetadataService.listAll(pageable);
        }

        Page<SeoMetadataResponse> responsePage = result.map(this::toResponse);
        return ResponseEntity.ok(responsePage);
    }

    // ── Get single entry ───────────────────────────────────────

    @GetMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('seo_metadata', 'read')")
    public ResponseEntity<SeoMetadataResponse> getById(@PathVariable String id) {
        SeoMetadata metadata = seoMetadataService.getById(id);
        return ResponseEntity.ok(toResponse(metadata));
    }

    // ── Manual update ──────────────────────────────────────────

    @PutMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('seo_metadata', 'update')")
    public ResponseEntity<SeoMetadataResponse> update(
            @PathVariable String id,
            @Valid @RequestBody SeoMetadataUpdateRequest request) {

        SeoMetadata updated = seoMetadataService.updateManually(
                id,
                request.getMetaDescription(),
                request.getKeywords(),
                request.getOgDescription(),
                request.getSlug());

        return ResponseEntity.ok(toResponse(updated));
    }

    // ── Delete ─────────────────────────────────────────────────

    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('seo_metadata', 'delete')")
    public ResponseEntity<String> delete(@PathVariable String id) {
        seoMetadataService.deleteById(id);
        return ResponseEntity.ok("SEO metadata eliminado correctamente");
    }

    // ── Regenerate AI for one entity ───────────────────────────

    @PostMapping("/{entityType}/{entityId}/regenerate")
    @PreAuthorize("@permissionCheck.hasPermission('seo_metadata', 'update')")
    public ResponseEntity<String> regenerate(
            @PathVariable String entityType,
            @PathVariable String entityId) {

        SeoEntityType type = SeoEntityType.valueOf(entityType.toUpperCase());

        if (type == SeoEntityType.PROJECT) {
            seoMetadataService.regenerateForProject(entityId);
        }

        return ResponseEntity.ok("Regeneración SEO iniciada");
    }

    // ── Bulk generate for all entities missing SEO ─────────────

    @PostMapping("/bulk-generate")
    @PreAuthorize("@permissionCheck.hasPermission('seo_metadata', 'create')")
    public ResponseEntity<String> bulkGenerate() {
        seoMetadataService.bulkGenerateForProjects();
        return ResponseEntity.ok("Generación masiva SEO iniciada");
    }

    // ── Response mapping ───────────────────────────────────────

    private SeoMetadataResponse toResponse(SeoMetadata metadata) {
        SeoMetadataResponse response = new SeoMetadataResponse();
        response.setId(metadata.getId());
        response.setEntityType(metadata.getEntityType().name());
        response.setEntityId(metadata.getEntityId());
        response.setEntityName(seoMetadataService.resolveEntityName(
                metadata.getEntityType(), metadata.getEntityId()));
        response.setMetaDescription(metadata.getMetaDescription());
        response.setKeywords(metadata.getKeywords());
        response.setOgDescription(metadata.getOgDescription());
        response.setSlug(metadata.getSlug());
        response.setCreatedAt(metadata.getCreatedAt());
        response.setUpdatedAt(metadata.getUpdatedAt());
        return response;
    }

    // ── DTOs ───────────────────────────────────────────────────

    @Data
    public static class SeoMetadataResponse {
        private String id;
        private String entityType;
        private String entityId;
        private String entityName;
        private String metaDescription;
        private String keywords;
        private String ogDescription;
        private String slug;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data
    public static class SeoMetadataUpdateRequest {
        @Size(max = 200, message = "Meta description no puede exceder 200 caracteres")
        private String metaDescription;

        private String keywords;

        @Size(max = 300, message = "OG description no puede exceder 300 caracteres")
        private String ogDescription;

        @Size(max = 200, message = "Slug no puede exceder 200 caracteres")
        private String slug;
    }
}
