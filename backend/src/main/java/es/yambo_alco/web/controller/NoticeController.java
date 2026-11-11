package es.yambo_alco.web.controller;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import es.yambo_alco.web.model.Notice;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.NoticeService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Tablón de anuncios (issue #132). La lectura de anuncios activos está
 * abierta a cualquier socio autenticado (widget del inicio); crear, editar
 * y borrar está gated por el permiso {@code notice}. La web pública
 * (issue #133) se sirve aparte, desde {@link PublicController}.
 */
@RestController
@RequestMapping("/notices")
@RequiredArgsConstructor
public class NoticeController {

    private final NoticeService noticeService;
    private final AuthService authService;

    @GetMapping("/active")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<NoticeResponse>> listActive() {
        return ResponseEntity.ok(noticeService.getActive().stream().map(NoticeResponse::new).toList());
    }

    @GetMapping
    @PreAuthorize("@permissionCheck.hasPermission('notice', 'read')")
    public ResponseEntity<List<NoticeResponse>> listAll() {
        return ResponseEntity.ok(noticeService.getAll().stream().map(NoticeResponse::new).toList());
    }

    @GetMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('notice', 'read')")
    public ResponseEntity<NoticeResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(new NoticeResponse(noticeService.getById(id)));
    }

    @PostMapping
    @PreAuthorize("@permissionCheck.hasPermission('notice', 'create')")
    public ResponseEntity<NoticeResponse> create(@Valid @RequestBody NoticeRequest request) {
        String createdBy = authService.getCurrentUser(true).getName();
        Notice notice = noticeService.create(
                request.getTitle(), request.getContent(), request.getImage(), request.isPinned(), request.isPublic(),
                request.getExpiresAt(), createdBy);
        return ResponseEntity.status(201).body(new NoticeResponse(notice));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('notice', 'update')")
    public ResponseEntity<NoticeResponse> update(@PathVariable String id, @Valid @RequestBody NoticeRequest request) {
        Notice notice = noticeService.update(
                id, request.getTitle(), request.getContent(), request.getImage(), request.isPinned(), request.isPublic(),
                request.getExpiresAt());
        return ResponseEntity.ok(new NoticeResponse(notice));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('notice', 'delete')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        noticeService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @Data
    public static class NoticeRequest {
        @NotBlank(message = "El título es obligatorio")
        private String title;
        @NotBlank(message = "El contenido es obligatorio")
        private String content;
        private String image;
        private boolean pinned;
        @JsonProperty("public")
        @JsonAlias("isPublic")
        private boolean isPublic;
        private LocalDateTime expiresAt;
    }

    @Data
    public static class NoticeResponse {
        private String id;
        private String title;
        private String content;
        private String image;
        private String slug;
        private boolean pinned;
        @JsonProperty("public")
        private boolean isPublic;
        private LocalDateTime publishedAt;
        private LocalDateTime expiresAt;
        private String createdBy;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public NoticeResponse(Notice notice) {
            this.id = notice.getId();
            this.title = notice.getTitle();
            this.content = notice.getContent();
            this.image = notice.getImage();
            this.slug = notice.getSlug();
            this.pinned = notice.isPinned();
            this.isPublic = notice.isPublic();
            this.publishedAt = notice.getPublishedAt();
            this.expiresAt = notice.getExpiresAt();
            this.createdBy = notice.getCreatedBy();
            this.createdAt = notice.getCreatedAt();
            this.updatedAt = notice.getUpdatedAt();
        }
    }
}
