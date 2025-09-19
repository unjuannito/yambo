package es.yambo_alco.web.controller;

import com.fasterxml.jackson.databind.ObjectMapper;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.controller.AuthController.LoginRequest;
import es.yambo_alco.web.controller.AuthController.RegisterRequest;
import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.InvitationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AuthController.class)
@Import(TestSecurityConfig.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;
    
    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private InvitationService invitationService;

    @Test
    void login_WithValidCredentials_ShouldReturnToken() throws Exception {
        // Given
        LoginRequest loginRequest = new LoginRequest("admin", "admin");
        when(authService.authenticate("admin", "admin")).thenReturn("test.jwt.token");

        // When & Then
        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("test.jwt.token"));
    }

    @Test
    void login_WithInvalidCredentials_ShouldReturnUnauthorized() throws Exception {
        // Given
        LoginRequest loginRequest = new LoginRequest("invalid", "invalid");
        when(authService.authenticate(any(), any()))
                .thenThrow(new BadCredentialsException("Invalid credentials"));

        // When & Then
        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Invalid credentials"));
    }

    @Test
    void register_WithValidInvitation_ShouldReturnToken() throws Exception {
        // Given
        RegisterRequest registerRequest = new RegisterRequest("newuser", "password", "New User");
        User user = User.builder().username("newuser").build();
        when(invitationService.completeInvitation("valid-token", "newuser", "password", "New User")).thenReturn(user);
        when(authService.authenticate("newuser", "password")).thenReturn("test.jwt.token");

        // When & Then
        mockMvc.perform(post("/auth/register")
                .param("invitation", "valid-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("test.jwt.token"));
    }

    @Test
    void register_WithInvalidInvitation_ShouldReturnBadRequest() throws Exception {
        // Given
        RegisterRequest registerRequest = new RegisterRequest("newuser", "password", "New User");
        when(invitationService.completeInvitation(any(), any(), any(), any()))
                .thenThrow(new ResourceNotFoundException("Invitation not found"));

        // When & Then
        mockMvc.perform(post("/auth/register")
                .param("invitation", "invalid-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isNotFound())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.message").value("Invitation not found"));
    }

    @Test
    void register_WithUsedInvitation_ShouldReturnBadRequest() throws Exception {
        // Given
        RegisterRequest registerRequest = new RegisterRequest("newuser", "password", "New User");
        when(invitationService.completeInvitation(any(), any(), any(), any()))
                .thenThrow(new BadRequestException("Invitation already used"));

        // When & Then
        mockMvc.perform(post("/auth/register")
                .param("invitation", "used-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.message").value("Invitation already used"));
    }
}
