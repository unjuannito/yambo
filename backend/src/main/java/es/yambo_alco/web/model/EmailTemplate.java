package es.yambo_alco.web.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Optional override of one built-in automatic email (issue #123).
 * <p>
 * The {@code key} is the template key (the Thymeleaf template name without the
 * {@code emails/} prefix, e.g. {@code invitation}). A row with a non-null
 * {@code body} makes {@code HtmlMailService} render that body instead of the
 * built-in classpath template; a {@code null} body means "use the built-in
 * default".
 * <p>
 * The body and subject are <b>markdown</b> using {@code {{token}}}
 * placeholders (e.g. {@code {{nombre}}}, {@code {{boton}}}) — <b>not</b> Thymeleaf.
 * They are never parsed by the template engine, so they cannot break it or be used
 * for template injection; at render time the markdown is converted to sanitised,
 * inline-styled HTML, the tokens are resolved with the email's real data, and the
 * result is wrapped in the brand layout.
 * <p>
 * The {@code key} is a business key assigned by the caller (one row per known
 * template), so it uses a plain {@code @Id} rather than {@code @CustomId}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "email_template", schema = "public")
public class EmailTemplate {

    /** Template key, e.g. {@code invitation}, {@code order-pending-payment}. */
    @Id
    @Column(nullable = false, length = 80)
    private String key;

    /**
     * Optional subject override (markdown, may contain {@code {{token}}}
     * placeholders). Null means the caller computes the subject as it always did.
     */
    @Column(columnDefinition = "TEXT")
    private String subject;

    /**
     * Optional body override (markdown with {@code {{token}}} placeholders).
     * Null means "use the built-in template".
     */
    @Column(columnDefinition = "TEXT")
    private String body;

    @Column(name = "updated_by", length = 80)
    private String updatedBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
