package es.yambo_alco.web.model;

import es.yambo_alco.web.util.CustomId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "uploaded_file", schema = "public")
public class UploadedFile {

    @Id
    @CustomId
    private String id;

    /** Original filename as uploaded by the user */
    @Column(name = "original_name", nullable = false)
    private String originalName;

    /** Stored filename on disk (sanitized + salted, unique) */
    @Column(name = "stored_name", nullable = false, unique = true)
    private String storedName;

    /** MIME type, e.g. image/png, application/pdf */
    @Column(name = "content_type", nullable = false)
    private String contentType;

    /** File size in bytes */
    @Column(nullable = false)
    private Long size;

    /** Relative URL path to access the file */
    @Column(nullable = false, length = 500)
    private String url;

    /** User who uploaded the file */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by", nullable = false)
    private User uploadedBy;

    @Column(name = "uploaded_at", nullable = false)
    private LocalDateTime uploadedAt;

    @PrePersist
    private void prePersist() {
        if (uploadedAt == null) {
            uploadedAt = LocalDateTime.now();
        }
    }
}
