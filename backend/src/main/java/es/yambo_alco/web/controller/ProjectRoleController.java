package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.ProjectRole;
import es.yambo_alco.web.service.ProjectRoleService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * CRUD de roles de proyecto configurables (issue #126) en Administración.
 * Protegido con el permiso {@code project_role}.
 */
@RestController
@RequestMapping("/admin/project-roles")
@RequiredArgsConstructor
public class ProjectRoleController {

    private final ProjectRoleService projectRoleService;

    @GetMapping
    @PreAuthorize("@permissionCheck.hasPermission('project_role', 'read')")
    public ResponseEntity<List<ProjectRoleResponse>> listRoles() {
        return ResponseEntity.ok(
                projectRoleService.listAll().stream().map(ProjectRoleResponse::new).toList());
    }

    @GetMapping("/team")
    @PreAuthorize("@permissionCheck.hasPermission('project_role', 'read')")
    public ResponseEntity<List<ProjectRoleResponse>> listTeamRoles() {
        return ResponseEntity.ok(
                projectRoleService.listTeamRoles().stream().map(ProjectRoleResponse::new).toList());
    }

    @PostMapping
    @PreAuthorize("@permissionCheck.hasPermission('project_role', 'create')")
    public ResponseEntity<ProjectRoleResponse> createRole(@Valid @RequestBody CreateRoleRequest request) {
        return ResponseEntity.ok(new ProjectRoleResponse(
                projectRoleService.create(request.getKey(), request.getName(), request.isTeam())));
    }

    @PutMapping("/{key}")
    @PreAuthorize("@permissionCheck.hasPermission('project_role', 'update')")
    public ResponseEntity<ProjectRoleResponse> updateRole(
            @PathVariable String key, @Valid @RequestBody UpdateRoleRequest request) {
        return ResponseEntity.ok(new ProjectRoleResponse(
                projectRoleService.update(key, request.getName(), request.getIsTeam())));
    }

    @DeleteMapping("/{key}")
    @PreAuthorize("@permissionCheck.hasPermission('project_role', 'delete')")
    public ResponseEntity<Void> deleteRole(@PathVariable String key) {
        projectRoleService.delete(key);
        return ResponseEntity.noContent().build();
    }

    @Data
    public static class ProjectRoleResponse {
        private String key;
        private String name;
        private boolean isTeam;

        public ProjectRoleResponse(ProjectRole role) {
            this.key = role.getKey();
            this.name = role.getName();
            this.isTeam = role.isTeam();
        }
    }

    @Data
    public static class CreateRoleRequest {
        @NotBlank(message = "La clave del rol no puede estar vacía")
        private String key;

        @NotBlank(message = "El nombre del rol no puede estar vacío")
        private String name;

        private boolean isTeam;
    }

    @Data
    public static class UpdateRoleRequest {
        @NotBlank(message = "El nombre del rol no puede estar vacío")
        private String name;

        private Boolean isTeam;
    }
}
