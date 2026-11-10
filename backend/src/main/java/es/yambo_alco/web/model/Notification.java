package es.yambo_alco.web.model;

import es.yambo_alco.web.util.CustomId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * Aviso persistente de la bandeja de avisos (issue #124).
 *
 * Un socio puede recibir varios avisos; cada uno se guarda aquí (leído/no leído)
 * y además se empuja en tiempo real a sus pestañas abiertas por WebSocket. El
 * correo electrónico queda como canal aparte y sigue respetando las
 * preferencias de notificación del socio.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "notification", schema = "public")
public class Notification {

    @Id
    @CustomId
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    /** Categoría del aviso (ORDER_STATUS, ORDER_CANCEL, ISSUE_CREATED, ...). */
    @Column(name = "type", length = 40)
    private String type;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String body;

    /** Ruta interna a la que enlaza el aviso (p. ej. /mi-espacio/pedidos/ABC1234). */
    @Column(name = "link", length = 300)
    private String link;

    @Builder.Default
    @Column(name = "is_read", nullable = false)
    private boolean isRead = false;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    private void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public void markRead(LocalDateTime at) {
        this.isRead = true;
        this.readAt = at;
    }
}
