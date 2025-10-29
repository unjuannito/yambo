package es.yambo_alco.web.service;

import es.yambo_alco.web.model.Permission;
import es.yambo_alco.web.model.Role;
import es.yambo_alco.web.repository.PermissionRepository;
import es.yambo_alco.web.repository.RoleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class RoleServiceTest {

    private RoleRepository roleRepository;
    private PermissionRepository permissionRepository;
    private RoleService roleService;

    @BeforeEach
    public void setup() {
        roleRepository = Mockito.mock(RoleRepository.class);
        permissionRepository = Mockito.mock(PermissionRepository.class);
        roleService = new RoleService(roleRepository, permissionRepository);
    }

    @Test
    public void getAllRoles_ShouldReturnAllRoles() {
        // Given
        Role role1 = Role.builder().id("SOCIO").permissions(new HashSet<>()).build();
        Role role2 = Role.builder().id("MONITOR").permissions(new HashSet<>()).build();
        List<Role> roles = List.of(role1, role2);

        when(roleRepository.findAll()).thenReturn(roles);

        // When
        List<Role> result = roleService.getAllRoles();

        // Then
        assertThat(result).hasSize(2);
        assertThat(result).containsExactlyInAnyOrder(role1, role2);
        verify(roleRepository, times(1)).findAll();
    }

    @Test
    public void getAllRoles_WithNoRoles_ShouldReturnEmptyList() {
        // Given
        when(roleRepository.findAll()).thenReturn(List.of());

        // When
        List<Role> result = roleService.getAllRoles();

        // Then
        assertThat(result).isEmpty();
        verify(roleRepository, times(1)).findAll();
    }

    @Test
    public void getRoleById_WithExistingRole_ShouldReturnRole() {
        // Given
        Role role = Role.builder().id("SOCIO").permissions(new HashSet<>()).build();
        when(roleRepository.findById("SOCIO")).thenReturn(Optional.of(role));

        // When
        Role result = roleService.getRoleById("SOCIO");

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo("SOCIO");
        verify(roleRepository, times(1)).findById("SOCIO");
    }

    @Test
    public void getRoleById_WithNonExistentRole_ShouldThrowException() {
        // Given
        when(roleRepository.findById("NON_EXISTENT")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> roleService.getRoleById("NON_EXISTENT"))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Role not found: NON_EXISTENT");

        verify(roleRepository, times(1)).findById("NON_EXISTENT");
    }

    @Test
    public void getAllPermissions_ShouldReturnAllPermissions() {
        // Given
        Permission perm1 = Permission.builder().id("VIEW_USERS").build();
        Permission perm2 = Permission.builder().id("EDIT_USERS").build();
        List<Permission> permissions = List.of(perm1, perm2);

        when(permissionRepository.findAll()).thenReturn(permissions);

        // When
        List<Permission> result = roleService.getAllPermissions();

        // Then
        assertThat(result).hasSize(2);
        assertThat(result).containsExactlyInAnyOrder(perm1, perm2);
        verify(permissionRepository, times(1)).findAll();
    }

    @Test
    public void getAllPermissions_WithNoPermissions_ShouldReturnEmptyList() {
        // Given
        when(permissionRepository.findAll()).thenReturn(List.of());

        // When
        List<Permission> result = roleService.getAllPermissions();

        // Then
        assertThat(result).isEmpty();
        verify(permissionRepository, times(1)).findAll();
    }

    @Test
    public void updateRolePermissions_WithValidData_ShouldUpdatePermissions() {
        // Given
        Role existingRole = Role.builder()
                .id("SOCIO")
                .permissions(new HashSet<>())
                .build();

        Permission perm1 = Permission.builder().id("VIEW_USERS").build();
        Permission perm2 = Permission.builder().id("EDIT_USERS").build();

        when(roleRepository.findById("SOCIO")).thenReturn(Optional.of(existingRole));
        when(permissionRepository.findById("VIEW_USERS")).thenReturn(Optional.of(perm1));
        when(permissionRepository.findById("EDIT_USERS")).thenReturn(Optional.of(perm2));
        when(roleRepository.save(any(Role.class))).thenReturn(existingRole);

        // When
        Role result = roleService.updateRolePermissions("SOCIO", Set.of("VIEW_USERS", "EDIT_USERS"));

        // Then
        assertThat(result.getPermissions()).hasSize(2);
        assertThat(result.getPermissions()).extracting("id").containsExactlyInAnyOrder("VIEW_USERS", "EDIT_USERS");
        verify(roleRepository, times(1)).save(any(Role.class));
    }

    @Test
    public void updateRolePermissions_WithNonExistentRole_ShouldThrowException() {
        // Given
        when(roleRepository.findById("NON_EXISTENT")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> roleService.updateRolePermissions("NON_EXISTENT", Set.of("VIEW_USERS")))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Role not found: NON_EXISTENT");

        verify(roleRepository, never()).save(any(Role.class));
    }

    @Test
    public void updateRolePermissions_WithNonExistentPermission_ShouldThrowException() {
        // Given
        Role existingRole = Role.builder().id("SOCIO").permissions(new HashSet<>()).build();

        when(roleRepository.findById("SOCIO")).thenReturn(Optional.of(existingRole));
        when(permissionRepository.findById("NON_EXISTENT_PERM")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> roleService.updateRolePermissions("SOCIO", Set.of("NON_EXISTENT_PERM")))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Permission not found: NON_EXISTENT_PERM");

        verify(roleRepository, never()).save(any(Role.class));
    }

    @Test
    public void createRole_WithValidData_ShouldCreateRole() {
        // Given
        Permission perm1 = Permission.builder().id("VIEW_USERS").build();
        Permission perm2 = Permission.builder().id("EDIT_USERS").build();

        when(roleRepository.existsById("NEW_ROLE")).thenReturn(false);
        when(permissionRepository.findById("VIEW_USERS")).thenReturn(Optional.of(perm1));
        when(permissionRepository.findById("EDIT_USERS")).thenReturn(Optional.of(perm2));
        when(roleRepository.save(any(Role.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Role result = roleService.createRole("NEW_ROLE", Set.of("VIEW_USERS", "EDIT_USERS"));

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo("NEW_ROLE");
        assertThat(result.getPermissions()).hasSize(2);
        verify(roleRepository, times(1)).save(any(Role.class));
    }

    @Test
    public void createRole_WithNullPermissions_ShouldCreateRoleWithEmptyPermissions() {
        // Given
        when(roleRepository.existsById("NEW_ROLE")).thenReturn(false);
        when(roleRepository.save(any(Role.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Role result = roleService.createRole("NEW_ROLE", null);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo("NEW_ROLE");
        assertThat(result.getPermissions()).isEmpty();
        verify(roleRepository, times(1)).save(any(Role.class));
    }

    @Test
    public void createRole_WithEmptyPermissions_ShouldCreateRoleWithEmptyPermissions() {
        // Given
        when(roleRepository.existsById("NEW_ROLE")).thenReturn(false);
        when(roleRepository.save(any(Role.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Role result = roleService.createRole("NEW_ROLE", Set.of());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo("NEW_ROLE");
        assertThat(result.getPermissions()).isEmpty();
        verify(roleRepository, times(1)).save(any(Role.class));
    }

    @Test
    public void createRole_WithExistingRoleId_ShouldThrowException() {
        // Given
        when(roleRepository.existsById("EXISTING_ROLE")).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> roleService.createRole("EXISTING_ROLE", Set.of("VIEW_USERS")))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Role already exists: EXISTING_ROLE");

        verify(roleRepository, never()).save(any(Role.class));
    }

    @Test
    public void createRole_WithNonExistentPermission_ShouldThrowException() {
        // Given
        when(roleRepository.existsById("NEW_ROLE")).thenReturn(false);
        when(permissionRepository.findById("NON_EXISTENT_PERM")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> roleService.createRole("NEW_ROLE", Set.of("NON_EXISTENT_PERM")))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Permission not found: NON_EXISTENT_PERM");

        verify(roleRepository, never()).save(any(Role.class));
    }

    @Test
    public void deleteRole_WithExistingRole_ShouldDeleteRole() {
        // Given
        Role role = Role.builder().id("SOCIO").permissions(new HashSet<>()).build();
        when(roleRepository.findById("SOCIO")).thenReturn(Optional.of(role));

        // When
        roleService.deleteRole("SOCIO");

        // Then
        verify(roleRepository, times(1)).findById("SOCIO");
        verify(roleRepository, times(1)).delete(role);
    }

    @Test
    public void deleteRole_WithNonExistentRole_ShouldThrowException() {
        // Given
        when(roleRepository.findById("NON_EXISTENT")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> roleService.deleteRole("NON_EXISTENT"))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Role not found: NON_EXISTENT");

        verify(roleRepository, never()).delete(any(Role.class));
    }

    @Test
    public void updateRoleDefaultStatus_SetAsDefault_ShouldRemoveOtherDefaults() {
        // Given
        Role targetRole = Role.builder().id("SOCIO").isDefault(false).permissions(new HashSet<>()).build();
        Role otherDefaultRole1 = Role.builder().id("MONITOR").isDefault(true).permissions(new HashSet<>()).build();
        Role otherDefaultRole2 = Role.builder().id("ADMIN").isDefault(true).permissions(new HashSet<>()).build();

        when(roleRepository.findById("SOCIO")).thenReturn(Optional.of(targetRole));
        when(roleRepository.findByIsDefaultTrue()).thenReturn(List.of(otherDefaultRole1, otherDefaultRole2));
        when(roleRepository.save(any(Role.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Role result = roleService.updateRoleDefaultStatus("SOCIO", true);

        // Then
        assertThat(result.isDefault()).isTrue();
        assertThat(otherDefaultRole1.isDefault()).isFalse();
        assertThat(otherDefaultRole2.isDefault()).isFalse();
        verify(roleRepository, times(3)).save(any(Role.class)); // 2 for removing defaults + 1 for setting new
    }

    @Test
    public void updateRoleDefaultStatus_SetAsFalse_ShouldNotAffectOtherRoles() {
        // Given
        Role targetRole = Role.builder().id("SOCIO").isDefault(true).permissions(new HashSet<>()).build();

        when(roleRepository.findById("SOCIO")).thenReturn(Optional.of(targetRole));
        when(roleRepository.save(any(Role.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Role result = roleService.updateRoleDefaultStatus("SOCIO", false);

        // Then
        assertThat(result.isDefault()).isFalse();
        verify(roleRepository, times(1)).save(any(Role.class)); // Only saves the target role
        verify(roleRepository, never()).findByIsDefaultTrue();
    }

    @Test
    public void updateRoleDefaultStatus_SetAsDefaultWhenAlreadyDefault_ShouldOnlyRemoveOthers() {
        // Given
        Role targetRole = Role.builder().id("SOCIO").isDefault(true).permissions(new HashSet<>()).build();
        Role otherDefaultRole = Role.builder().id("MONITOR").isDefault(true).permissions(new HashSet<>()).build();

        when(roleRepository.findById("SOCIO")).thenReturn(Optional.of(targetRole));
        when(roleRepository.findByIsDefaultTrue()).thenReturn(List.of(targetRole, otherDefaultRole));
        when(roleRepository.save(any(Role.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Role result = roleService.updateRoleDefaultStatus("SOCIO", true);

        // Then
        assertThat(result.isDefault()).isTrue();
        assertThat(otherDefaultRole.isDefault()).isFalse();
        verify(roleRepository, times(2)).save(any(Role.class)); // 1 for removing other default + 1 for target
    }

    @Test
    public void updateRoleDefaultStatus_WithNonExistentRole_ShouldThrowException() {
        // Given
        when(roleRepository.findById("NON_EXISTENT")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> roleService.updateRoleDefaultStatus("NON_EXISTENT", true))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Role not found: NON_EXISTENT");

        verify(roleRepository, never()).save(any(Role.class));
    }

    @Test
    public void updateRoleDefaultStatus_SetAsDefaultWithNoOtherDefaults_ShouldOnlySaveTarget() {
        // Given
        Role targetRole = Role.builder().id("SOCIO").isDefault(false).permissions(new HashSet<>()).build();

        when(roleRepository.findById("SOCIO")).thenReturn(Optional.of(targetRole));
        when(roleRepository.findByIsDefaultTrue()).thenReturn(List.of());
        when(roleRepository.save(any(Role.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Role result = roleService.updateRoleDefaultStatus("SOCIO", true);

        // Then
        assertThat(result.isDefault()).isTrue();
        verify(roleRepository, times(1)).save(any(Role.class)); // Only saves the target role
    }
}
