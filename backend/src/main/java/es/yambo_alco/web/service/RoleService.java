package es.yambo_alco.web.service;

import es.yambo_alco.web.model.Permission;
import es.yambo_alco.web.model.Role;
import es.yambo_alco.web.repository.PermissionRepository;
import es.yambo_alco.web.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    public List<Role> getAllRoles() {
        return roleRepository.findAll();
    }

    public Role getRoleById(String id) {
        return roleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Role not found: " + id));
    }

    public List<Permission> getAllPermissions() {
        return permissionRepository.findAll();
    }

    @Transactional
    public Role updateRolePermissions(String roleId, Set<String> permissionIds) {
        Role role = getRoleById(roleId);
        
        Set<Permission> permissions = new HashSet<>();
        for (String permissionId : permissionIds) {
            Permission permission = permissionRepository.findById(permissionId)
                    .orElseThrow(() -> new RuntimeException("Permission not found: " + permissionId));
            permissions.add(permission);
        }
        
        role.setPermissions(permissions);
        return roleRepository.save(role);
    }

    @Transactional
    public Role createRole(String roleId, Set<String> permissionIds) {
        if (roleRepository.existsById(roleId)) {
            throw new RuntimeException("Role already exists: " + roleId);
        }

        Set<Permission> permissions = new HashSet<>();
        if (permissionIds != null) {
            for (String permissionId : permissionIds) {
                Permission permission = permissionRepository.findById(permissionId)
                        .orElseThrow(() -> new RuntimeException("Permission not found: " + permissionId));
                permissions.add(permission);
            }
        }

        Role role = Role.builder()
                .id(roleId)
                .permissions(permissions)
                .build();

        return roleRepository.save(role);
    }

    @Transactional
    public void deleteRole(String roleId) {
        Role role = getRoleById(roleId);
        roleRepository.delete(role);
    }

    @Transactional
    public Role updateRoleDefaultStatus(String roleId, boolean isDefault) {
        Role role = getRoleById(roleId);
        
        // If setting this role as default, remove default status from all other roles
        if (isDefault) {
            List<Role> defaultRoles = roleRepository.findByIsDefaultTrue();
            for (Role defaultRole : defaultRoles) {
                if (!defaultRole.getId().equals(roleId)) {
                    defaultRole.setDefault(false);
                    roleRepository.save(defaultRole);
                }
            }
        }
        
        role.setDefault(isDefault);
        return roleRepository.save(role);
    }
}
