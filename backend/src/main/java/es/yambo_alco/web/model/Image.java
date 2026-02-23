package es.yambo_alco.web.model;

import es.yambo_alco.web.model.enums.ImageUsageContext;
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
@Table(name = "image", schema = "public")
public class Image {

    @Id
    @CustomId
    private String id;

    /** Original filename as uploaded by the user */
    @Column(name = "original_name", nullable = false)
    private String originalName;

    /** Stored filename on disk (unique, generated) */
    @Column(name = "stored_name", nullable = false, unique = true)
    private String storedName;

    /** MIME type, e.g. image/png */
    @Column(name = "content_type", nullable = false)
    private String contentType;

    /** File size in bytes */
    @Column(nullable = false)
    private Long size;

    /** Relative URL path to access the image */
    @Column(nullable = false, length = 500)
    private String url;

    /** Where this image is used */
    @Enumerated(EnumType.ORDINAL)
    @Column(nullable = false)
    private ImageUsageContext context;

    /** ID of the entity this image is associated with (user id, product id, project id, etc.) */
    @Column(name = "reference_id")
    private String referenceId;

    /** User who uploaded the image */
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
