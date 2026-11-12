package es.yambo_alco.web.model;

import es.yambo_alco.web.util.CustomId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Elemento común editable del envoltorio de comunicados (issue #123, Part 2).
 * <p>
 * {@code header}/{@code footer} se siembran con un valor por defecto (109-03)
 * y los usa {@code EmailRenderer.envelope()} — los 15 correos automáticos
 * built-in no pasan por aquí, tienen su propia cabecera por tipo de correo
 * (ver {@code emails/layout/base-email}). El admin puede además crear sus
 * propios componentes desde la GUI (p. ej. una firma, un bloque de redes
 * sociales); esos no los usa nada del código todavía — viven como texto con
 * placeholders {@code {{token}}} para que el admin los copie/pegue dentro del
 * cuerpo de una plantilla o comunicado.
 * <p>
 * {@code html} es texto plano con placeholders {@code {{token}}} — nunca
 * Thymeleaf, igual que los cuerpos de personalización de correo.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "email_common_element", schema = "public")
public class EmailCommonElement {

    @Id
    @CustomId
    @Column(nullable = false, length = 8)
    private String id;

    /**
     * Clave estable usada por el código, p. ej. {@code header}/{@code footer}.
     * Columna {@code element_key}, no {@code key}: ese nombre es palabra
     * reservada en H2 (entorno de test) y Liquibase lo escapa a mayúsculas
     * al crear la tabla, rompiendo cualquier SQL propio que lo referencie en
     * minúscula — se evita el problema entero con un nombre sin conflicto.
     */
    @Column(name = "element_key", nullable = false, length = 32, unique = true)
    private String key;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String html;

    @Column(columnDefinition = "TEXT")
    private String description;

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
