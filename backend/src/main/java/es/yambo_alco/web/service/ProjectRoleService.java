package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.ProjectRole;
import es.yambo_alco.web.model.enums.GrantType;
import es.yambo_alco.web.repository.AccessGrantRepository;
import es.yambo_alco.web.repository.ProjectRoleRepository;
import es.yambo_alco.web.repository.UserProjectGroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * CRUD de roles de proyecto configurables (issue #126).
 *
 * <p>Los roles sustituyen al enum fijo {@code UserProjectGroupRole}: cada asociación
 * define sus propios roles (clave, nombre y marca "es equipo"). Al crear o editar un
 * rol se propagan sus efectos a los datos ya existentes:</p>
 * <ul>
 *   <li><b>crear</b>: clave estable (se sugiere en mayúsculas) + nombre único.</li>
 *   <li><b>editar</b>: la clave no se cambia (es la que guardan pertenencias y accesos);
 *       al cambiar la marca "es equipo" se refresca el {@code is_team} desnormalizado
 *       de las pertenencias que ya usan el rol.</li>
 *   <li><b>borrar</b>: solo si nadie lo usa — sin pertenencias ni grants vigentes.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class ProjectRoleService {

    /** Roles por defecto sembrados por la migración; no se pueden borrar. */
    private static final Set<String> SEED_ROLE_KEYS = Set.of("MONITOR", "COORDINATOR", "PARENT");

    private final ProjectRoleRepository projectRoleRepository;
    private final UserProjectGroupRepository userProjectGroupRepository;
    private final AccessGrantRepository accessGrantRepository;

    @Transactional(readOnly = true)
    public List<ProjectRole> listAll() {
        return projectRoleRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<ProjectRole> listTeamRoles() {
        return projectRoleRepository.findByIsTeamTrueOrderByNameAsc();
    }

    @Transactional(readOnly = true)
    public ProjectRole getById(String key) {
        return projectRoleRepository.findById(key)
                .orElseThrow(() -> new ResourceNotFoundException("Project role not found: " + key));
    }

    @Transactional
    public ProjectRole create(String key, String name, boolean isTeam) {
        if (key == null || key.isBlank()) {
            throw new BadRequestException("La clave del rol no puede estar vacía");
        }
        String normalizedKey = key.trim().toUpperCase(Locale.ROOT);
        if (normalizedKey.length() > 40) {
            throw new BadRequestException("La clave del rol no puede superar 40 caracteres");
        }
        if (name == null || name.isBlank()) {
            throw new BadRequestException("El nombre del rol no puede estar vacío");
        }
        if (projectRoleRepository.existsById(normalizedKey)) {
            throw new BadRequestException("Ya existe un rol con la clave " + normalizedKey);
        }
        if (projectRoleRepository.existsByName(name.trim())) {
            throw new BadRequestException("Ya existe un rol con el nombre «" + name.trim() + "»");
        }

        ProjectRole role = ProjectRole.builder()
                .key(normalizedKey)
                .name(name.trim())
                .isTeam(isTeam)
                .build();
        return projectRoleRepository.save(role);
    }

    @Transactional
    public ProjectRole update(String key, String name, Boolean isTeam) {
        ProjectRole role = getById(key);
        if (name == null || name.isBlank()) {
            throw new BadRequestException("El nombre del rol no puede estar vacío");
        }
        if (projectRoleRepository.existsByName(name.trim())) {
            ProjectRole other = projectRoleRepository.findByName(name.trim()).orElse(null);
            if (other != null && !other.getKey().equals(role.getKey())) {
                throw new BadRequestException("Ya existe un rol con el nombre «" + name.trim() + "»");
            }
        }
        role.setName(name.trim());
        if (isTeam != null && isTeam != role.isTeam()) {
            role.setTeam(isTeam);
            // Refresca el is_team desnormalizado de las pertenencias que usan el rol.
            for (var upg : userProjectGroupRepository.findByRole(role.getKey())) {
                upg.setTeam(isTeam);
            }
        }
        return projectRoleRepository.save(role);
    }

    @Transactional
    public void delete(String key) {
        ProjectRole role = getById(key);
        if (SEED_ROLE_KEYS.contains(role.getKey())) {
            throw new BadRequestException(
                    "No se puede borrar un rol por defecto (" + role.getKey() + "); desactívalo o renómbralo");
        }
        long memberships = userProjectGroupRepository.countByRole(role.getKey());
        if (memberships > 0) {
            throw new BadRequestException(
                    "No se puede borrar: " + memberships + " pertenencia(s) usan el rol " + role.getKey());
        }
        long activeGrants = accessGrantRepository.countByGrantTypeAndRoleAndRevokedAtIsNull(GrantType.GROUP_ROLE, role.getKey());
        if (activeGrants > 0) {
            throw new BadRequestException(
                    "No se puede borrar: " + activeGrants + " acceso(s) vigente(s) usan el rol " + role.getKey());
        }
        projectRoleRepository.delete(role);
    }
}
