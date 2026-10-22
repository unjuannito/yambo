package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.UploadedFile;
import es.yambo_alco.web.service.UploadedFileService;
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
@RequestMapping("/files")
@RequiredArgsConstructor
public class UploadedFileController {

    private final UploadedFileService uploadedFileService;

    /**
     * Upload a file.
     */
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<FileResponse> upload(
            @RequestParam("file") MultipartFile file) {
        UploadedFile uploadedFile = uploadedFileService.upload(file);
        return ResponseEntity.status(HttpStatus.CREATED).body(new FileResponse(uploadedFile));
    }

    /**
     * Get file metadata by ID.
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<FileResponse> getById(@PathVariable String id) {
        UploadedFile uploadedFile = uploadedFileService.getById(id);
        return ResponseEntity.ok(new FileResponse(uploadedFile));
    }

    /**
     * List all files uploaded by the current user.
     */
    @GetMapping("/mine")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<FileResponse>> listMine() {
        List<UploadedFile> files = uploadedFileService.listMyFiles();
        return ResponseEntity.ok(files.stream().map(FileResponse::new).toList());
    }

    /**
     * Delete a file by ID (file on disk + database record).
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        uploadedFileService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // --- Response DTO ---

    @Data
    public static class FileResponse {
        private String id;
        private String originalName;
        private String contentType;
        private Long size;
        private String url;
        private String uploadedBy;
        private String uploadedByName;
        private LocalDateTime uploadedAt;

        public FileResponse(UploadedFile file) {
            this.id = file.getId();
            this.originalName = file.getOriginalName();
            this.contentType = file.getContentType();
            this.size = file.getSize();
            this.url = file.getUrl();
            this.uploadedBy = file.getUploadedBy().getId();
            this.uploadedByName = file.getUploadedBy().getName();
            this.uploadedAt = file.getUploadedAt();
        }
    }
}
