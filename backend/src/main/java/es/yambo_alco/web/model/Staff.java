package es.yambo_alco.web.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

/**
 * Data of a staff member — monitor and/or coordinator — as a 1:1 extension of {@link User}.
 * The row is created when the user is promoted (manually or by getting a MONITOR/COORDINATOR
 * group role) and is kept when the user stops being staff, so the data is not lost.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "userId")
@ToString(exclude = "user")
@Entity
@Table(name = "staff")
public class Staff {

    @Id
    @Column(name = "user_id")
    private String userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(length = 500)
    private String photo;

    /** The photo as uploaded; {@link #photo} is this one framed with {@link #photoEdit}. */
    @Column(name = "photo_original", length = 500)
    private String photoOriginal;

    /** Framing applied to the original; null for photos uploaded before it could be adjusted. */
    @Column(name = "photo_edit", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private StaffPhotoEdit photoEdit;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "fun_fact", length = 100)
    private String funFact;

    @Column(length = 50)
    private String nickname;

    /**
     * The card itself is public for the whole team; this is the staff member's own consent
     * to show their photo on it. Without it a generic avatar is shown instead.
     */
    @Builder.Default
    @Column(name = "photo_consent", nullable = false)
    private boolean photoConsent = false;

    /** Their customised elephant, shown when the photo is not; null means the default one. */
    @Column(columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private StaffAvatar avatar;

    /** Link to their #comosenotaqueeresdeyambo Instagram post. */
    @Column(name = "instagram_url", length = 300)
    private String instagramUrl;

    /** When the staff member consented to showing their photo; null while they have not. */
    @Column(name = "photo_consent_at")
    private LocalDateTime photoConsentAt;

    /** When the user stopped being staff; null while they are. Old inactive rows are purged. */
    @Column(name = "inactive_since")
    private LocalDateTime inactiveSince;

    /** Added to the staff by hand, regardless of group roles. */
    @Builder.Default
    @Column(nullable = false)
    private boolean manual = false;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
