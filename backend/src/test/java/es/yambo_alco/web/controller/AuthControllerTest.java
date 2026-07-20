package es.yambo_alco.web.controller;

import com.fasterxml.jackson.databind.ObjectMapper;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.controller.AuthController.LoginRequest;
import es.yambo_alco.web.controller.AuthController.InvitationRegisterRequest;
import es.yambo_alco.web.controller.AuthController.ForgotPasswordRequest;
import es.yambo_alco.web.controller.AuthController.ResetPasswordRequest;
import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.NominativeInvitationService;
import es.yambo_alco.web.service.PasswordResetService;
import es.yambo_alco.web.service.oauth.OAuthProvider;
import es.yambo_alco.web.service.oauth.OAuthProviderRegistry;
import es.yambo_alco.web.jwt.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.springframework.security.test.context.support.WithMockUser;

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
        private NominativeInvitationService nominativeInvitationService;

        @MockitoBean
        private PasswordResetService passwordResetService;

        @MockitoBean
        private OAuthProviderRegistry oauthProviderRegistry;

        @MockitoBean
        private JwtService jwtService;

        @MockitoBean
        private OAuthProvider googleProvider;

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
                                .andExpect(jsonPath("$.message").value("Invalid username or password"))
                                .andExpect(jsonPath("$.type").value("AUTHENTICATION_FAILED"))
                                .andExpect(jsonPath("$.id").exists())
                                .andExpect(jsonPath("$.timestamp").exists());
        }

        @Test
        void login_WithNonExistentUser_ShouldReturnUnauthorized() throws Exception {
                // Given
                LoginRequest loginRequest = new LoginRequest("nonexistent", "password");
                when(authService.authenticate(any(), any()))
                                .thenThrow(new UsernameNotFoundException("User not found"));

                // When & Then
                mockMvc.perform(post("/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(loginRequest)))
                                .andExpect(status().isUnauthorized())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.status").value(401))
                                .andExpect(jsonPath("$.message").value("Invalid username or password"))
                                .andExpect(jsonPath("$.type").value("AUTHENTICATION_FAILED"))
                                .andExpect(jsonPath("$.id").exists())
                                .andExpect(jsonPath("$.timestamp").exists());
        }

        @Test
        void register_WithValidInvitation_ShouldReturnToken() throws Exception {
                // Given
                InvitationRegisterRequest registerRequest = new InvitationRegisterRequest("password", "New User");
                User user = User.builder().email("newuser").build();
                when(nominativeInvitationService.completeInvitation("valid-token", "password", "New User"))
                                .thenReturn(user);
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
                InvitationRegisterRequest registerRequest = new InvitationRegisterRequest("password", "New User");
                when(nominativeInvitationService.completeInvitation(any(), any(), any()))
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
                InvitationRegisterRequest registerRequest = new InvitationRegisterRequest("password", "New User");
                when(nominativeInvitationService.completeInvitation(any(), any(), any()))
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

        @Test
        @WithMockUser(username = "testuser")
        void reload_WithAuthenticatedUser_ShouldReturnNewToken() throws Exception {
                // Given
                when(authService.reload()).thenReturn("new.jwt.token");

                // When & Then
                mockMvc.perform(post("/auth/reload")
                                .header("Authorization", "Bearer old.jwt.token")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.token").value("new.jwt.token"));
        }

        @Test
        @WithMockUser(username = "testuser")
        void reload_WithAuthenticatedUser_ShouldGenerateFreshToken() throws Exception {
                // Given
                String refreshedToken = "refreshed.jwt.token.with.new.expiration";
                when(authService.reload()).thenReturn(refreshedToken);

                // When & Then
                mockMvc.perform(post("/auth/reload")
                                .header("Authorization", "Bearer expiring.jwt.token")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.token").value(refreshedToken));
        }

        // ── OAuth2 Config Tests ────────────────────────────────────────────

        @Test
        void getOAuth2Config_WithEnabledProvider_ShouldReturnProviders() throws Exception {
                when(googleProvider.getProviderName()).thenReturn("google");
                when(googleProvider.getDisplayName()).thenReturn("Google");
                when(googleProvider.isEnabled()).thenReturn(true);
                when(googleProvider.getClientId()).thenReturn("test-client-id.apps.googleusercontent.com");
                when(oauthProviderRegistry.getEnabledProviders()).thenReturn(List.of(googleProvider));

                mockMvc.perform(get("/auth/oauth2/config"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.providers").isArray())
                                .andExpect(jsonPath("$.providers.length()").value(1))
                                .andExpect(jsonPath("$.providers[0].name").value("google"))
                                .andExpect(jsonPath("$.providers[0].displayName").value("Google"))
                                .andExpect(jsonPath("$.providers[0].clientId").value("test-client-id.apps.googleusercontent.com"));
        }

        @Test
        void getOAuth2Config_WithNoEnabledProviders_ShouldReturnEmptyList() throws Exception {
                when(oauthProviderRegistry.getEnabledProviders()).thenReturn(List.of());

                mockMvc.perform(get("/auth/oauth2/config"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.providers").isArray())
                                .andExpect(jsonPath("$.providers.length()").value(0));
        }

        // ── OAuth2 Login Tests ────────────────────────────────────────────

        @Test
        void oauthLogin_WithEnabledProvider_ShouldRedirect() throws Exception {
                when(oauthProviderRegistry.getProvider("google")).thenReturn(Optional.of(googleProvider));
                when(googleProvider.isEnabled()).thenReturn(true);
                when(googleProvider.buildAuthUrl(anyString())).thenReturn("https://accounts.google.com/o/oauth2/auth?client_id=test");

                mockMvc.perform(get("/auth/oauth2/google"))
                                .andExpect(status().is3xxRedirection())
                                .andExpect(header().string("Location", "https://accounts.google.com/o/oauth2/auth?client_id=test"));
        }

        @Test
        void oauthLogin_WithDisabledProvider_ShouldReturnBadRequest() throws Exception {
                when(oauthProviderRegistry.getProvider("google")).thenReturn(Optional.of(googleProvider));
                when(googleProvider.isEnabled()).thenReturn(false);

                mockMvc.perform(get("/auth/oauth2/google"))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.message").value("OAuth provider 'google' is not enabled"));
        }

        @Test
        void oauthLogin_WithUnknownProvider_ShouldReturnBadRequest() throws Exception {
                when(oauthProviderRegistry.getProvider("unknown")).thenReturn(Optional.empty());

                mockMvc.perform(get("/auth/oauth2/unknown"))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.message").value("OAuth provider 'unknown' not found"));
        }

        @Test
        void oauthCallback_WithInvalidCode_ShouldRedirectToLoginWithError() throws Exception {
                when(oauthProviderRegistry.getProvider("google")).thenReturn(Optional.of(googleProvider));
                when(googleProvider.processCallback(anyString(), anyString()))
                                .thenThrow(new RuntimeException("Invalid code"));

                mockMvc.perform(get("/auth/google/callback").param("code", "invalid-code"))
                                .andExpect(status().is3xxRedirection())
                                .andExpect(header().string("Location", "/login?error=oauth_auth_failed&provider=google"));
        }

        // ── Generic provider endpoints ────────────────────────────────────

        @Test
        void oauthLogin_Generic_WithEnabledProvider_ShouldRedirect() throws Exception {
                when(oauthProviderRegistry.getProvider("google")).thenReturn(Optional.of(googleProvider));
                when(googleProvider.isEnabled()).thenReturn(true);
                when(googleProvider.buildAuthUrl(anyString())).thenReturn("https://accounts.google.com/o/oauth2/auth");

                mockMvc.perform(get("/auth/oauth2/google"))
                                .andExpect(status().is3xxRedirection());
        }

        // ── Password Reset Tests ──────────────────────────────────────────

        @Test
        void forgotPassword_ShouldAlwaysReturn200() throws Exception {
                // Given
                ForgotPasswordRequest request = new ForgotPasswordRequest("user@example.com");
                doNothing().when(passwordResetService).requestPasswordReset(anyString());

                // When & Then
                mockMvc.perform(post("/auth/forgot-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.message").exists());

                verify(passwordResetService).requestPasswordReset("user@example.com");
        }

        @Test
        void forgotPassword_WithUnknownEmail_ShouldStillReturn200() throws Exception {
                // Given - service silently returns for unknown emails
                ForgotPasswordRequest request = new ForgotPasswordRequest("unknown@example.com");
                doNothing().when(passwordResetService).requestPasswordReset(anyString());

                // When & Then
                mockMvc.perform(post("/auth/forgot-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.message").exists());
        }

        @Test
        void resetPassword_WithValidToken_ShouldReturn200() throws Exception {
                // Given
                ResetPasswordRequest request = new ResetPasswordRequest("valid-token", "newPassword123");
                doNothing().when(passwordResetService).resetPassword(anyString(), anyString());

                // When & Then
                mockMvc.perform(post("/auth/reset-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.message").value("Contraseña actualizada correctamente."));

                verify(passwordResetService).resetPassword("valid-token", "newPassword123");
        }

        @Test
        void resetPassword_WithInvalidToken_ShouldReturnBadRequest() throws Exception {
                // Given
                ResetPasswordRequest request = new ResetPasswordRequest("invalid-token", "newPassword123");
                doThrow(new BadRequestException("Token inválido"))
                                .when(passwordResetService).resetPassword(anyString(), anyString());

                // When & Then
                mockMvc.perform(post("/auth/reset-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.message").value("Token inválido"));
        }

        @Test
        void resetPassword_WithExpiredToken_ShouldReturnBadRequest() throws Exception {
                // Given
                ResetPasswordRequest request = new ResetPasswordRequest("expired-token", "newPassword123");
                doThrow(new BadRequestException("El enlace ha expirado"))
                                .when(passwordResetService).resetPassword(anyString(), anyString());

                // When & Then
                mockMvc.perform(post("/auth/reset-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.message").value("El enlace ha expirado"));
        }

        @Test
        void resetPassword_WithUsedToken_ShouldReturnBadRequest() throws Exception {
                // Given
                ResetPasswordRequest request = new ResetPasswordRequest("used-token", "newPassword123");
                doThrow(new BadRequestException("El enlace ya fue utilizado"))
                                .when(passwordResetService).resetPassword(anyString(), anyString());

                // When & Then
                mockMvc.perform(post("/auth/reset-password")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.message").value("El enlace ya fue utilizado"));
        }
}
