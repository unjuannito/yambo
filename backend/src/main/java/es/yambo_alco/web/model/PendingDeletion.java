package es.yambo_alco.web.model;

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
@Table(name = "pending_deletion")
public class PendingDeletion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DeletionObjectType objectType;

    @Column(nullable = false)
    private String objectId;

    @Column(nullable = false)
    private LocalDateTime requestedAt;

    @Column(nullable = false)
    private LocalDateTime scheduledAt;

    @Column
    private String deletionStatus;
}