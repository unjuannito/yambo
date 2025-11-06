package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.exception.UnauthorizedException;
import es.yambo_alco.web.model.Permission;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.PendingDeletionService;
import es.yambo_alco.web.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Set;

@WebMvcTest(controllers = UserController.class)
@Import(TestSecurityConfig.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private PendingDeletionService pendingDeletionService;

    @Test
    void getUserData_WithValidToken_ShouldReturnUserData() throws Exception {
        // Given
        AuthController.AuthResponse authResponse = new AuthController.AuthResponse("test.jwt.token");
        when(authService.getCurrentUser(true)).thenReturn(
                User.builder()
                        .password("password")
                        .email("testuser@example.com")
                        .name("Test User")
                        .profiles(Set.of(
                                Profile.builder().id("ROLE_USER")
                                        .permissions(Set.of(
                                                Permission.builder().id("READ_PRIVILEGES").resource("USER").action("READ").build(),
                                                Permission.builder().id("WRITE_PRIVILEGES").resource("USER").action("WRITE").build()))
                                        .build(),
                                Profile.builder().id("ROLE_ADMIN").build()))
                        .enabled(true)
                        .build());

        // When & Then
        mockMvc.perform(get("/user/me")
                .header("Authorization", "Bearer " + authResponse.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("testuser@example.com"))
                .andExpect(jsonPath("$.name").value("Test User"))
                .andExpect(jsonPath("$.permissions").isArray())
                .andExpect(jsonPath("$.permissions.length()").value(1))
                .andExpect(jsonPath("$.permissions[0].obj").value("USER"))
                .andExpect(jsonPath("$.permissions[0].actions", org.hamcrest.Matchers.containsInAnyOrder("READ", "WRITE")));
    }

    @Test
    void getUserData_Unauthorized_ShouldReturnUnauthorized() throws Exception {
        // Given
        when(authService.getCurrentUser(true)).thenThrow(new UnauthorizedException("Unauthorized access"));

        // When & Then
        mockMvc.perform(get("/user/me")
                .header("Authorization", "Bearer invalid.token"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Unauthorized access"));
    }

    @Test
    void updateProfile_WithValidData_ShouldReturnUpdatedUser() throws Exception {
        // Given
        User currentUser = User.builder()
                .id("U0000001")
                .email("testuser")
                .email("testuser@example.com")
                .name("Old Name")
                .profiles(Set.of())
                .build();
        User updatedUser = User.builder()
                .id("U0000001")
                .email("testuser")
                .email("newemail@example.com")
                .name("New Name")
                .profiles(Set.of())
                .build();

        when(authService.getCurrentUser(true)).thenReturn(currentUser);
        when(userService.updateProfile("U0000001", "New Name", "newemail@example.com")).thenReturn(updatedUser);

        String requestBody = """
                {
                    "name": "New Name",
                    "email": "newemail@example.com"
                }
                """;

        // When & Then
        mockMvc.perform(put("/user/profile")
                .header("Authorization", "Bearer test.jwt.token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("newemail@example.com"))
                .andExpect(jsonPath("$.name").value("New Name"));
    }

    @Test
    void updateProfile_WithInvalidData_ShouldReturnBadRequest() throws Exception {
        // Given
        String requestBody = """
                {
                    "name": "",
                    "email": "invalid-email"
                }
                """;

        // When & Then
        mockMvc.perform(put("/user/profile")
                .header("Authorization", "Bearer test.jwt.token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isBadRequest());
    }

    @Test
    void changePassword_WithValidData_ShouldReturnOk() throws Exception {
        // Given
        User currentUser = User.builder().id("U0000001").build();
        when(authService.getCurrentUser(true)).thenReturn(currentUser);

        String requestBody = """
                {
                    "oldPassword": "oldPass123",
                    "newPassword": "newPass123"
                }
                """;

        // When & Then
        mockMvc.perform(put("/user/change-password")
                .header("Authorization", "Bearer test.jwt.token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk());
    }

    @Test
    void changePassword_WithInvalidData_ShouldReturnBadRequest() throws Exception {
        // Given
        String requestBody = """
                {
                    "oldPassword": "",
                    "newPassword": "short"
                }
                """;

        // When & Then
        mockMvc.perform(put("/user/change-password")
                .header("Authorization", "Bearer test.jwt.token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deleteAccount_WithValidToken_ShouldDeleteSuccessfully() throws Exception {
        // Given
        User currentUser = User.builder().id("U0000001").build();
        when(authService.getCurrentUser(true)).thenReturn(currentUser);

        // When & Then
        mockMvc.perform(post("/user/delete")
                .header("Authorization", "Bearer test.jwt.token"))
                .andExpect(status().isOk())
                .andExpect(content().string("User account scheduled for deletion in 30 days"));
    }

    @Test
    void deleteAccount_Unauthorized_ShouldReturnUnauthorized() throws Exception {
        // Given
        when(authService.getCurrentUser(true)).thenThrow(new UnauthorizedException("Unauthorized access"));

        // When & Then
        mockMvc.perform(post("/user/delete")
                .header("Authorization", "Bearer invalid.token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"days\": 30}"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Unauthorized access"));
    }

}