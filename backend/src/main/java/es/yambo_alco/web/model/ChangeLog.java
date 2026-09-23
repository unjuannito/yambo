package es.yambo_alco.web.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Registro genérico y reutilizable de cambios (auditoría) sobre cualquier
 * entidad de la aplicación. Cada fila describe qué se hizo sobre un registro,
 * quién lo hizo, cuándo y a qué incidencia estaba vinculado.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "change_log", schema = "public")
public class ChangeLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, columnDefinition = "UUID")
    private UUID id;

    /** Tipo de entidad modificada: "ORDER_PRODUCT", "ORDER", "ISSUE", ... */
    @Column(name = "entity_type", nullable = false, length = 64)
    private String entityType;

    /** ID del registro modificado. */
    @Column(name = "entity_id", nullable = false, length = 64)
    private String entityId;

    /** Acción realizada: "ADDED", "MODIFIED", "REMOVED", "UNCHANGED". */
    @Column(nullable = false, length = 16)
    private String action;

    /** Usuario que realizó el cambio. */
    @Column(name = "user_id")
    private String userId;

    /** Incidencia vinculada al cambio (opcional). */
    @Column(name = "issue_id")
    private String issueId;

    /** Pedido de contexto (opcional, útil para el historial de un pedido). */
    @Column(name = "order_id")
    private String orderId;

    @Builder.Default
    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt = LocalDateTime.now();

    /** Descripción legible del cambio. */
    @Column(columnDefinition = "text")
    private String summary;

    /** Estado previo serializado (JSON). */
    @Column(name = "before_json", columnDefinition = "text")
    private String beforeJson;

    /** Estado posterior serializado (JSON). */
    @Column(name = "after_json", columnDefinition = "text")
    private String afterJson;
}
