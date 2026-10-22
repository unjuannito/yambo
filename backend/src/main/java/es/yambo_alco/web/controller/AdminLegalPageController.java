package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.LegalPage;
import es.yambo_alco.web.service.LegalPageService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/legal")
@RequiredArgsConstructor
public class AdminLegalPageController {

    private final LegalPageService legalPageService;

    @GetMapping
    @PreAuthorize("@permissionCheck.hasPermission('legal_page', 'read')")
    public ResponseEntity<List<LegalPageAdminResponse>> listAll() {
        List<LegalPage> pages = legalPageService.getAllPages();
        List<LegalPageAdminResponse> response = pages.stream()
                .map(LegalPageAdminResponse::new)
                .toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('legal_page', 'read')")
    public ResponseEntity<LegalPageAdminResponse> getById(@PathVariable String id) {
        LegalPage page = legalPageService.getById(id);
        return ResponseEntity.ok(new LegalPageAdminResponse(page));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('legal_page', 'update')")
    public ResponseEntity<LegalPageAdminResponse> update(
            @PathVariable String id,
            @Valid @RequestBody LegalPageUpdateRequest request) {

        LegalPage updated = legalPageService.update(id, request.getTitle(), request.getContent(), request.isPublished());
        return ResponseEntity.ok(new LegalPageAdminResponse(updated));
    }

    @Data
    public static class LegalPageAdminResponse {
        private String id;
        private String type;
        private String title;
        private String content;
        private int version;
        private boolean published;
        private java.time.LocalDateTime publishedAt;
        private java.time.LocalDateTime createdAt;
        private java.time.LocalDateTime updatedAt;

        public LegalPageAdminResponse(LegalPage page) {
            this.id = page.getId();
            this.type = page.getType();
            this.title = page.getTitle();
            this.content = page.getContent();
            this.version = page.getVersion();
            this.published = page.isPublished();
            this.publishedAt = page.getPublishedAt();
            this.createdAt = page.getCreatedAt();
            this.updatedAt = page.getUpdatedAt();
        }
    }

    @Data
    public static class LegalPageUpdateRequest {
        @NotBlank(message = "El título no puede estar vacío")
        @Size(max = 255, message = "El título no puede exceder 255 caracteres")
        private String title;

        @NotBlank(message = "El contenido no puede estar vacío")
        private String content;

        private boolean published;
    }
}
