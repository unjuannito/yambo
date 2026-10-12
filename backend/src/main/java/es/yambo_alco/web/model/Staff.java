package es.yambo_alco.web.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

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

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "fun_fact", length = 100)
    private String funFact;

    @Column(length = 50)
    private String nickname;

    /** Opt-in: only staff with this flag are shown on the public site. */
    @Builder.Default
    @Column(name = "public_visible", nullable = false)
    private boolean publicVisible = false;

    /** When the staff member opted in; null while not public. */
    @Column(name = "public_visible_at")
    private LocalDateTime publicVisibleAt;

    /** Added to the staff by hand, regardless of group roles. */
    @Builder.Default
    @Column(nullable = false)
    private boolean manual = false;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
