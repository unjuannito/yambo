package es.yambo_alco.web.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Historial de cambios sobre un pedido (edición por administración).
 *
 * <p>Patrón reutilizable: quién, cuándo, acción, incidencia vinculada y estado
 * previo/posterior. Para otros dominios (p. ej. productos, incidencias) se crean
 * tablas hermanas con la misma forma en lugar de una tabla genérica.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "order_change", schema = "public")
public class OrderChange {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, columnDefinition = "UUID")
    private UUID id;

    /** Pedido al que pertenece el cambio. */
    @Column(name = "order_id", nullable = false)
    private String orderId;

    /** Producto del pedido afectado (null si el cambio es a nivel de pedido). */
    @Column(name = "order_product_id", columnDefinition = "UUID")
    private UUID orderProductId;

    /** Acción: ADDED, MODIFIED, REMOVED o UNCHANGED. */
    @Column(nullable = false, length = 16)
    private String action;

    /** Usuario que realizó el cambio. */
    @Column(name = "user_id")
    private String userId;

    /** Incidencia vinculada al cambio (opcional). */
    @Column(name = "issue_id")
    private String issueId;

    @Builder.Default
    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt = LocalDateTime.now();

    /** Descripción legible del cambio. */
    @Column(columnDefinition = "text")
    private String summary;

    /** Estado previo del producto/pedido (JSON). */
    @Column(name = "before_json", columnDefinition = "text")
    private String beforeJson;

    /** Estado posterior del producto/pedido (JSON). */
    @Column(name = "after_json", columnDefinition = "text")
    private String afterJson;
}
