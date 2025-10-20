package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.model.Role;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.UserService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Set;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AdminUserController.class)
@Import(TestSecurityConfig.class)
public class AdminUserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private AuthService authService;

    @Test
    @WithMockUser(authorities = "LIST_USERS")
    public void listUsers_ok() throws Exception {
        User u = User.builder().id(1L).username("u").email("a@b.com").name("User").enabled(true).build();
        Mockito.when(userService.listUsers(Mockito.anyString(), Mockito.anyString(), Mockito.any(), Mockito.anyList(),
                Mockito.anyList(), Mockito.any(PageRequest.class))).thenReturn(new PageImpl<>(List.of(u)));

        mockMvc.perform(get("/admin/users").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    

    @Test
    @WithMockUser(authorities = "MANAGE_USERS")
    void updateUserRoles_WithValidData_ShouldReturnUpdatedUser() throws Exception {
        User updatedUser = User.builder()
                .id(2L)
                .username("user2")
                .email("user2@example.com")
                .name("User Two")
                .roles(Set.of(
                        Role.builder().id("ROLE_USER").build(),
                        Role.builder().id("ROLE_ADMIN").build()))
                .build();

        when(userService.updateUserRoles(2L, Set.of("ROLE_USER", "ROLE_ADMIN"))).thenReturn(updatedUser);

        String requestBody = """
                {
                    "roleIds": ["ROLE_USER", "ROLE_ADMIN"]
                }
                """;

        mockMvc.perform(put("/admin/users/roles?userId=2")
                .header("Authorization", "Bearer test.jwt.token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("user2"))
                .andExpect(jsonPath("$.roles", org.hamcrest.Matchers.containsInAnyOrder("ROLE_USER", "ROLE_ADMIN")));
    }

    @Test
    @WithMockUser(authorities = "MANAGE_USERS")
    void updateUserRoles_WithEmptyRoles_ShouldReturnBadRequest() throws Exception {
        String requestBody = """
                {
                    "roleIds": []
                }
                """;

        mockMvc.perform(put("/admin/users/roles?userId=2")
                .header("Authorization", "Bearer test.jwt.token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(authorities = "MANAGE_USERS")
    void updateProfile_WithValidData_ShouldReturnUpdatedUser() throws Exception {
        User userToUpdate = User.builder()
                .id(1L)
                .username("olduser")
                .email("old@example.com")
                .name("Old Name")
                .roles(Set.of())
                .build();
        User updatedUser = User.builder()
                .id(1L)
                .username("olduser")
                .email("new@example.com")
                .name("New Name")
                .roles(Set.of())
                .build();

        when(userService.getUserById(1L)).thenReturn(userToUpdate);
        when(userService.updateProfile(1L, "New Name", "new@example.com")).thenReturn(updatedUser);

        String requestBody = """
                {
                    "id": 1,
                    "name": "New Name",
                    "email": "new@example.com"
                }
                """;

        mockMvc.perform(put("/admin/users/profile")
                .header("Authorization", "Bearer test.jwt.token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("olduser"))
                .andExpect(jsonPath("$.email").value("new@example.com"))
                .andExpect(jsonPath("$.name").value("New Name"));
    }

    @Test
    @WithMockUser(authorities = "MANAGE_USERS")
    void deleteUser_ShouldReturnOk() throws Exception {
        User currentUser = User.builder().id(1L).build();
        when(authService.getCurrentUser(true)).thenReturn(currentUser);

        mockMvc.perform(delete("/admin/users/2")
                .header("Authorization", "Bearer test.jwt.token"))
                .andExpect(status().isOk());
    }
    @Test
    @WithMockUser(authorities = "MANAGE_USERS")
    void deleteUser_SelfDeletion_ShouldReturnBadRequest() throws Exception {
        User currentUser = User.builder().id(1L).build();
        when(authService.getCurrentUser(true)).thenReturn(currentUser);

        mockMvc.perform(delete("/admin/users/1")
                .header("Authorization", "Bearer test.jwt.token"))
                .andExpect(status().isBadRequest());
    }
}
