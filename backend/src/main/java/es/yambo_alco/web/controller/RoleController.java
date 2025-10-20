package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.Permission;
import es.yambo_alco.web.model.Role;
import es.yambo_alco.web.service.RoleService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/admin/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService roleService;

    @GetMapping
    @PreAuthorize("hasAuthority('WRITE_PRIVILEGES')")
    public ResponseEntity<List<Role>> getAllRoles() {
        List<Role> roles = roleService.getAllRoles();
        return ResponseEntity.ok(roles);
    }

    @GetMapping("/{roleId}")
    @PreAuthorize("hasAuthority('WRITE_PRIVILEGES')")
    public ResponseEntity<Role> getRole(@PathVariable String roleId) {
        Role role = roleService.getRoleById(roleId);
        return ResponseEntity.ok(role);
    }

    @GetMapping("/permissions")
    @PreAuthorize("hasAuthority('WRITE_PRIVILEGES')")
    public ResponseEntity<List<Permission>> getAllPermissions() {
        List<Permission> permissions = roleService.getAllPermissions();
        return ResponseEntity.ok(permissions);
    }

    @PutMapping("/{roleId}/permissions")
    @PreAuthorize("hasAuthority('WRITE_PRIVILEGES')")
    public ResponseEntity<Role> updateRolePermissions(
            @PathVariable String roleId,
            @Valid @RequestBody UpdateRolePermissionsRequest request) {
        Role updatedRole = roleService.updateRolePermissions(roleId, request.getPermissionIds());
        return ResponseEntity.ok(updatedRole);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('MANAGE_USERS')")
    public ResponseEntity<Role> createRole(@Valid @RequestBody CreateRoleRequest request) {
        Role role = roleService.createRole(request.getRoleId(), request.getPermissionIds());
        return ResponseEntity.ok(role);
    }

    @DeleteMapping("/{roleId}")
    @PreAuthorize("hasAuthority('MANAGE_USERS')")
    public ResponseEntity<String> deleteRole(@PathVariable String roleId) {
        roleService.deleteRole(roleId);
        return ResponseEntity.ok("Role deleted successfully");
    }

    @PutMapping("/{roleId}/default")
    @PreAuthorize("hasAuthority('MANAGE_USERS')")
    public ResponseEntity<Role> updateRoleDefaultStatus(
            @PathVariable String roleId,
            @Valid @RequestBody UpdateRoleDefaultStatusRequest request) {
        if (request.getIsDefault() == null) {
            throw new IllegalArgumentException("isDefault field is required");
        }
        Role updatedRole = roleService.updateRoleDefaultStatus(roleId, request.getIsDefault());
        return ResponseEntity.ok(updatedRole);
    }

    @Data
    public static class UpdateRolePermissionsRequest {
        @NotEmpty(message = "At least one permission must be specified")
        private Set<String> permissionIds;
    }

    @Data
    public static class CreateRoleRequest {
        @NotBlank(message = "Role ID cannot be blank")
        private String roleId;

        private Set<String> permissionIds;
    }

    @Data
    public static class UpdateRoleDefaultStatusRequest {
        private Boolean isDefault;
    }
}
