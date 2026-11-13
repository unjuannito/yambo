package es.yambo_alco.web.model;

import es.yambo_alco.web.model.enums.CampaignAudience;
import es.yambo_alco.web.util.CustomId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * A broadcast / campaign email (issue #123): a composed message (subject +
 * inlined HTML body) plus an audience descriptor. Sending resolves the audience
 * to concrete recipients (honouring each member's opt-out) and delivers the
 * message to each one.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "email_campaign", schema = "public")
public class EmailCampaign {

    @Id
    @CustomId
    private String id;

    @Column(nullable = false, length = 255)
    private String subject;

    /** Inlined, email-safe HTML body. */
    @Column(columnDefinition = "TEXT")
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(name = "audience_type", nullable = false, length = 20)
    private CampaignAudience audienceType;

    /** Id of the profile / project / project-group, depending on {@link #audienceType}. */
    @Column(name = "audience_ref", length = 8)
    private String audienceRef;

    /** Explicit user ids (JSON array), used when {@code audienceType == USERS}. */
    @Column(name = "audience_users", columnDefinition = "TEXT")
    private String audienceUsersJson;

    /** Number of resolved recipients at send time. */
    @Builder.Default
    @Column(name = "recipient_count", nullable = false)
    private int recipientCount = 0;

    @Builder.Default
    @Column(nullable = false, length = 20)
    private String status = "DRAFT";

    @Column(name = "sent_by", length = 80)
    private String sentBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = "DRAFT";
        }
    }

    private static final com.fasterxml.jackson.databind.ObjectMapper MAPPER =
            new com.fasterxml.jackson.databind.ObjectMapper();

    /** Convenience: parse {@link #audienceUsersJson} into a list (empty when null/unparseable). */
    public List<String> audienceUsers() {
        if (audienceUsersJson == null || audienceUsersJson.isBlank()) {
            return List.of();
        }
        try {
            return MAPPER.readValue(audienceUsersJson,
                    MAPPER.getTypeFactory().constructCollectionType(List.class, String.class));
        } catch (Exception e) {
            return List.of();
        }
    }
}
