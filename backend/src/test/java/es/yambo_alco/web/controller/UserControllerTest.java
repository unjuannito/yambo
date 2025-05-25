package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.exception.UnauthorizedException;
import es.yambo_alco.web.model.Permission;
import es.yambo_alco.web.model.Role;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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

    @Test
    void getUserData_WithValidToken_ShouldReturnUserData() throws Exception {
        // Given
        AuthController.AuthResponse authResponse = new AuthController.AuthResponse("test.jwt.token");
        when(authService.getCurrentUser(true)).thenReturn(
                User.builder()
                        .username("testuser")
                        .password("password")
                        .email("testuser@example.com")
                        .roles(Set.of(
                                Role.builder().id("ROLE_USER")
                                        .permissions(Set.of(
                                                Permission.builder().id("READ_PRIVILEGES").build(),
                                                Permission.builder().id("WRITE_PRIVILEGES").build()))
                                        .build(),
                                Role.builder().id("ROLE_ADMIN").build()))
                        .build());

        // When & Then
        mockMvc.perform(get("/user/me")
            .header("Authorization", "Bearer " + authResponse.token()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.username").value("testuser"))
            .andExpect(jsonPath("$.email").value("testuser@example.com"))
            .andExpect(jsonPath("$.roles").isArray())
            .andExpect(jsonPath("$.roles", org.hamcrest.Matchers.containsInAnyOrder("ROLE_USER", "ROLE_ADMIN")))
            .andExpect(jsonPath("$.permissions").isArray())
            .andExpect(jsonPath("$.permissions", org.hamcrest.Matchers.containsInAnyOrder("READ_PRIVILEGES", "WRITE_PRIVILEGES")));
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
}
