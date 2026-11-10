package es.yambo_alco.web.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Rol de proyecto configurable (issue #126). Sustituye al enum fijo
 * {@code UserProjectGroupRole}: cada asociación define sus propios roles.
 *
 * <ul>
 *   <li>{@code key}: identificador estable (el que almacenan pertenencias,
 *       invitaciones y accesos de drops). Los roles por defecto conservan la
 *       clave del antiguo enum (MONITOR/COORDINATOR/PARENT), por lo que al
 *       migrar no hay que retocar los valores ya guardados.</li>
 *   <li>{@code name}: nombre legible editable (se muestra en la UI).</li>
 *   <li>{@code isTeam}: si quien tiene el rol forma parte del "equipo"
 *       (antes MONITOR/COORDINATOR lo eran, PARENT no). Es la marca que la UI
 *       de Administración edita y que el backend usa para detectar "equipo".</li>
 * </ul>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "project_role")
public class ProjectRole {

    @Id
    @Column(length = 40)
    private String key;

    @Column(nullable = false, unique = true, length = 120)
    private String name;

    @Column(name = "is_team", nullable = false)
    private boolean isTeam;
}
