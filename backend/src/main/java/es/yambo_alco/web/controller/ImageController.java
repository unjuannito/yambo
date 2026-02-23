package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.Image;
import es.yambo_alco.web.model.enums.ImageUsageContext;
import es.yambo_alco.web.service.ImageService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/images")
@RequiredArgsConstructor
public class ImageController {

    private final ImageService imageService;

    /**
     * Upload an image.
     * - context: where the image will be used (USER_PHOTO, PRODUCT_IMAGE, PROJECT_IMAGE)
     * - referenceId: the entity ID the image belongs to (user id, product id, etc.)
     */
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ImageResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("context") ImageUsageContext context,
            @RequestParam(value = "referenceId", required = false) String referenceId) {
        Image image = imageService.upload(file, context, referenceId);
        return ResponseEntity.status(HttpStatus.CREATED).body(new ImageResponse(image));
    }

    /**
     * Get image metadata by ID.
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ImageResponse> getById(@PathVariable String id) {
        Image image = imageService.getById(id);
        return ResponseEntity.ok(new ImageResponse(image));
    }

    /**
     * List images by context and reference.
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ImageResponse>> list(
            @RequestParam("context") ImageUsageContext context,
            @RequestParam(value = "referenceId", required = false) String referenceId) {
        List<Image> images = imageService.listByContextAndReference(context, referenceId);
        return ResponseEntity.ok(images.stream().map(ImageResponse::new).toList());
    }

    /**
     * List all images uploaded by the current user.
     */
    @GetMapping("/mine")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ImageResponse>> listMine() {
        List<Image> images = imageService.listMyImages();
        return ResponseEntity.ok(images.stream().map(ImageResponse::new).toList());
    }

    /**
     * Delete an image by ID (file on disk + database record).
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        imageService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // --- Response DTO ---

    @Data
    public static class ImageResponse {
        private String id;
        private String originalName;
        private String contentType;
        private Long size;
        private String url;
        private String context;
        private String referenceId;
        private String uploadedBy;
        private String uploadedByName;
        private LocalDateTime uploadedAt;

        public ImageResponse(Image image) {
            this.id = image.getId();
            this.originalName = image.getOriginalName();
            this.contentType = image.getContentType();
            this.size = image.getSize();
            this.url = image.getUrl();
            this.context = image.getContext().name();
            this.referenceId = image.getReferenceId();
            this.uploadedBy = image.getUploadedBy().getId();
            this.uploadedByName = image.getUploadedBy().getName();
            this.uploadedAt = image.getUploadedAt();
        }
    }
}
