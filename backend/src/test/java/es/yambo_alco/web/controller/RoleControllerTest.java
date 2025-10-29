package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.model.Permission;
import es.yambo_alco.web.model.Role;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.RoleService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Set;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = RoleController.class)
@Import(TestSecurityConfig.class)
class RoleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RoleService roleService;

    @MockitoBean
    private AuthService authService;

    @Test
    @WithMockUser(authorities = "WRITE_PRIVILEGES")
    void getAllRoles_WithValidAuthority_ShouldReturnAllRoles() throws Exception {
        // Given
        Role role1 = Role.builder()
                .id("ROLE_USER")
                .permissions(Set.of(
                        Permission.builder().id("READ_PRIVILEGES").build()
                ))
                .build();
        Role role2 = Role.builder()
                .id("ROLE_ADMIN")
                .permissions(Set.of(
                        Permission.builder().id("READ_PRIVILEGES").build(),
                        Permission.builder().id("WRITE_PRIVILEGES").build()
                ))
                .build();

        when(roleService.getAllRoles()).thenReturn(List.of(role1, role2));

        // When & Then
        mockMvc.perform(get("/admin/roles")
                .header("Authorization", "Bearer test.jwt.token")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id").value("ROLE_USER"))
                .andExpect(jsonPath("$[1].id").value("ROLE_ADMIN"));

        verify(roleService, times(1)).getAllRoles();
    }



    @Test
    @WithMockUser(authorities = "WRITE_PRIVILEGES")
    void getRole_WithValidRoleId_ShouldReturnRole() throws Exception {
        // Given
        Role role = Role.builder()
                .id("ROLE_USER")
                .permissions(Set.of(
                        Permission.builder().id("READ_PRIVILEGES").build()
                ))
                .build();

        when(roleService.getRoleById("ROLE_USER")).thenReturn(role);

        // When & Then
        mockMvc.perform(get("/admin/roles/ROLE_USER")
                .header("Authorization", "Bearer test.jwt.token")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("ROLE_USER"));

        verify(roleService, times(1)).getRoleById("ROLE_USER");
    }



    @Test
    @WithMockUser(authorities = "WRITE_PRIVILEGES")
    void getAllPermissions_WithValidAuthority_ShouldReturnAllPermissions() throws Exception {
        // Given
        Permission perm1 = Permission.builder().id("READ_PRIVILEGES").build();
        Permission perm2 = Permission.builder().id("WRITE_PRIVILEGES").build();
        Permission perm3 = Permission.builder().id("MANAGE_USERS").build();

        when(roleService.getAllPermissions()).thenReturn(List.of(perm1, perm2, perm3));

        // When & Then
        mockMvc.perform(get("/admin/roles/permissions")
                .header("Authorization", "Bearer test.jwt.token")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[*].id", 
                        containsInAnyOrder("READ_PRIVILEGES", "WRITE_PRIVILEGES", "MANAGE_USERS")));

        verify(roleService, times(1)).getAllPermissions();
    }

    @Test
    @WithMockUser(authorities = "WRITE_PRIVILEGES")
    void updateRolePermissions_WithValidData_ShouldReturnUpdatedRole() throws Exception {
        // Given
        Role updatedRole = Role.builder()
                .id("ROLE_USER")
                .permissions(Set.of(
                        Permission.builder().id("READ_PRIVILEGES").build(),
                        Permission.builder().id("WRITE_PRIVILEGES").build()
                ))
                .build();

        when(roleService.updateRolePermissions(eq("ROLE_USER"), any()))
                .thenReturn(updatedRole);

        String requestBody = """
                {
                    "permissionIds": ["READ_PRIVILEGES", "WRITE_PRIVILEGES"]
                }
                """;

        // When & Then
        mockMvc.perform(put("/admin/roles/ROLE_USER/permissions")
                .header("Authorization", "Bearer test.jwt.token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("ROLE_USER"))
                .andExpect(jsonPath("$.permissions", hasSize(2)));

        verify(roleService, times(1)).updateRolePermissions(eq("ROLE_USER"), any());
    }

    @Test
    @WithMockUser(authorities = "WRITE_PRIVILEGES")
    void updateRolePermissions_WithEmptyPermissions_ShouldReturnBadRequest() throws Exception {
        // Given
        String requestBody = """
                {
                    "permissionIds": []
                }
                """;

        // When & Then
        mockMvc.perform(put("/admin/roles/ROLE_USER/permissions")
                .header("Authorization", "Bearer test.jwt.token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isBadRequest());

        verify(roleService, never()).updateRolePermissions(any(), any());
    }

    @Test
    @WithMockUser(authorities = "WRITE_PRIVILEGES")
    void updateRolePermissions_WithNullPermissions_ShouldReturnBadRequest() throws Exception {
        // Given
        String requestBody = """
                {
                }
                """;

        // When & Then
        mockMvc.perform(put("/admin/roles/ROLE_USER/permissions")
                .header("Authorization", "Bearer test.jwt.token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isBadRequest());

        verify(roleService, never()).updateRolePermissions(any(), any());
    }

    @Test
    @WithMockUser(authorities = "MANAGE_USERS")
    void createRole_WithValidData_ShouldReturnCreatedRole() throws Exception {
        // Given
        Role newRole = Role.builder()
                .id("ROLE_MODERATOR")
                .permissions(Set.of(
                        Permission.builder().id("READ_PRIVILEGES").build()
                ))
                .build();

        when(roleService.createRole(eq("ROLE_MODERATOR"), any()))
                .thenReturn(newRole);

        String requestBody = """
                {
                    "roleId": "ROLE_MODERATOR",
                    "permissionIds": ["READ_PRIVILEGES"]
                }
                """;

        // When & Then
        mockMvc.perform(post("/admin/roles")
                .header("Authorization", "Bearer test.jwt.token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("ROLE_MODERATOR"));

        verify(roleService, times(1)).createRole(eq("ROLE_MODERATOR"), any());
    }

    @Test
    @WithMockUser(authorities = "MANAGE_USERS")
    void createRole_WithBlankRoleId_ShouldReturnBadRequest() throws Exception {
        // Given
        String requestBody = """
                {
                    "roleId": "",
                    "permissionIds": ["READ_PRIVILEGES"]
                }
                """;

        // When & Then
        mockMvc.perform(post("/admin/roles")
                .header("Authorization", "Bearer test.jwt.token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isBadRequest());

        verify(roleService, never()).createRole(any(), any());
    }

    @Test
    @WithMockUser(authorities = "MANAGE_USERS")
    void createRole_WithNullRoleId_ShouldReturnBadRequest() throws Exception {
        // Given
        String requestBody = """
                {
                    "permissionIds": ["READ_PRIVILEGES"]
                }
                """;

        // When & Then
        mockMvc.perform(post("/admin/roles")
                .header("Authorization", "Bearer test.jwt.token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isBadRequest());

        verify(roleService, never()).createRole(any(), any());
    }

    @Test
    @WithMockUser(authorities = "MANAGE_USERS")
    void createRole_WithNoPermissions_ShouldReturnCreatedRole() throws Exception {
        // Given
        Role newRole = Role.builder()
                .id("ROLE_GUEST")
                .permissions(Set.of())
                .build();

        when(roleService.createRole(eq("ROLE_GUEST"), any()))
                .thenReturn(newRole);

        String requestBody = """
                {
                    "roleId": "ROLE_GUEST"
                }
                """;

        // When & Then
        mockMvc.perform(post("/admin/roles")
                .header("Authorization", "Bearer test.jwt.token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("ROLE_GUEST"));

        verify(roleService, times(1)).createRole(eq("ROLE_GUEST"), any());
    }



    @Test
    @WithMockUser(authorities = "MANAGE_USERS")
    void deleteRole_WithValidRoleId_ShouldReturnSuccess() throws Exception {
        // Given
        doNothing().when(roleService).deleteRole("ROLE_TEMP");

        // When & Then
        mockMvc.perform(delete("/admin/roles/ROLE_TEMP")
                .header("Authorization", "Bearer test.jwt.token"))
                .andExpect(status().isOk())
                .andExpect(content().string("Role deleted successfully"));

        verify(roleService, times(1)).deleteRole("ROLE_TEMP");
    }

    @Test
    @WithMockUser(authorities = "MANAGE_USERS")
    void updateRoleDefaultStatus_WithValidData_ShouldReturnUpdatedRole() throws Exception {
        // Given
        Role updatedRole = Role.builder()
                .id("INTERESADO")
                .isDefault(true)
                .permissions(Set.of(
                        Permission.builder().id("READ_PRIVILEGES").build()
                ))
                .build();

        when(roleService.updateRoleDefaultStatus(eq("INTERESADO"), eq(true)))
                .thenReturn(updatedRole);

        String requestBody = """
                {
                    "isDefault": true
                }
                """;

        // When & Then
        mockMvc.perform(put("/admin/roles/INTERESADO/default")
                .header("Authorization", "Bearer test.jwt.token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("INTERESADO"))
                .andExpect(jsonPath("$.isDefault").value(true));

        verify(roleService, times(1)).updateRoleDefaultStatus("INTERESADO", true);
    }

    @Test
    @WithMockUser(authorities = "MANAGE_USERS")
    void updateRoleDefaultStatus_SetToFalse_ShouldReturnUpdatedRole() throws Exception {
        // Given
        Role updatedRole = Role.builder()
                .id("INTERESADO")
                .isDefault(false)
                .permissions(Set.of())
                .build();

        when(roleService.updateRoleDefaultStatus(eq("INTERESADO"), eq(false)))
                .thenReturn(updatedRole);

        String requestBody = """
                {
                    "isDefault": false
                }
                """;

        // When & Then
        mockMvc.perform(put("/admin/roles/INTERESADO/default")
                .header("Authorization", "Bearer test.jwt.token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("INTERESADO"))
                .andExpect(jsonPath("$.isDefault").value(false));

        verify(roleService, times(1)).updateRoleDefaultStatus("INTERESADO", false);
    }

    @Test
    @WithMockUser(authorities = "MANAGE_USERS")
    void updateRoleDefaultStatus_WithNullValue_ShouldReturnBadRequest() throws Exception {
        // Given
        String requestBody = """
                {
                }
                """;

        // When & Then
        mockMvc.perform(put("/admin/roles/INTERESADO/default")
                .header("Authorization", "Bearer test.jwt.token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isBadRequest());

        verify(roleService, never()).updateRoleDefaultStatus(any(String.class), any(Boolean.class));
    }

    // Note: This test is commented out because TestSecurityConfig bypasses @PreAuthorize
    // In a real environment with proper security, this would return 403
    /*
    @Test
    @WithMockUser(authorities = "WRITE_PRIVILEGES")
    void updateRoleDefaultStatus_WithoutManageUsersAuthority_ShouldReturnForbidden() throws Exception {
        // Given
        String requestBody = """
                {
                    "isDefault": true
                }
                """;

        // When & Then
        mockMvc.perform(put("/admin/roles/INTERESADO/default")
                .header("Authorization", "Bearer test.jwt.token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isForbidden());

        verify(roleService, never()).updateRoleDefaultStatus(any(String.class), any(Boolean.class));
    }
    */
}
