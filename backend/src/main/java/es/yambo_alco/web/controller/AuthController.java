package es.yambo_alco.web.controller;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.jwt.JwtService;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.NominativeInvitationService;
import es.yambo_alco.web.service.PasswordResetService;
import es.yambo_alco.web.service.oauth.OAuthProvider;
import es.yambo_alco.web.service.oauth.OAuthProviderRegistry;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;
    private final NominativeInvitationService nominativeInvitationService;
    private final PasswordResetService passwordResetService;
    private final OAuthProviderRegistry oauthProviderRegistry;
    private final JwtService jwtService;

    @Value("${server.servlet.context-path:}")
    private String contextPath;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        String token = authService.authenticate(request.email(), request.password());
        authService.recordLogin(request.email(), getClientIp(httpRequest), httpRequest.getHeader("User-Agent"));
        return ResponseEntity.ok(new AuthResponse(token));
    }

    // ── OAuth2 Generic Routes ──────────────────────────────────────────

    /**
     * Get all enabled OAuth providers with their client IDs for the login page.
     */
    @GetMapping("/oauth2/config")
    public ResponseEntity<OAuth2ConfigResponse> getOAuth2Config() {
        List<ProviderConfig> providers = oauthProviderRegistry.getEnabledProviders()
                .stream()
                .map(p -> new ProviderConfig(p.getProviderName(), p.getDisplayName(), p.getClientId()))
                .toList();
        return ResponseEntity.ok(new OAuth2ConfigResponse(providers));
    }

    /**
     * Initiate OAuth login for a specific provider.
     * Redirects the user to the provider's authorization page.
     */
    @GetMapping("/oauth2/{provider}")
    public void oauthLogin(
            @PathVariable String provider,
            HttpServletRequest request,
            HttpServletResponse response) throws Exception {
        OAuthProvider oauthProvider = oauthProviderRegistry.getProvider(provider)
                .orElseThrow(() -> new BadRequestException("OAuth provider '" + provider + "' not found"));

        if (!oauthProvider.isEnabled()) {
            throw new BadRequestException("OAuth provider '" + provider + "' is not enabled");
        }

        String redirectUri = buildRedirectUri(request, provider);
        String authUrl = oauthProvider.buildAuthUrl(redirectUri);
        response.sendRedirect(authUrl);
    }

    /**
     * Handle OAuth callback from a provider.
     */
    @GetMapping("/{provider}/callback")
    public void oauthCallback(
            @PathVariable String provider,
            @RequestParam String code,
            HttpServletRequest request,
            HttpServletResponse response) throws Exception {
        try {
            OAuthProvider oauthProvider = oauthProviderRegistry.getProvider(provider)
                    .orElseThrow(() -> new BadRequestException("OAuth provider '" + provider + "' not found"));

            String redirectUri = buildRedirectUri(request, provider);
            User user = oauthProvider.processCallback(code, redirectUri);
            String jwt = jwtService.generateToken(user);

            String frontendUrl = "/login?oauth_token=" + URLEncoder.encode(jwt, StandardCharsets.UTF_8)
                    + "&oauth_provider=" + URLEncoder.encode(provider, StandardCharsets.UTF_8);
            response.sendRedirect(frontendUrl);
        } catch (Exception e) {
            response.sendRedirect("/login?error=oauth_auth_failed&provider=" + URLEncoder.encode(provider, StandardCharsets.UTF_8));
        }
    }

    /**
     * Build the callback redirect URI for a given provider.
     */
    private String buildRedirectUri(HttpServletRequest request, String provider) {
        return request.getScheme() + "://" + request.getServerName()
            + (request.getServerPort() != 80 && request.getServerPort() != 443 ? ":" + request.getServerPort() : "")
            + contextPath + "/auth/" + provider + "/callback";
    }

    // ── Backward-compatible Google routes (delegate to generic) ─────────

    @GetMapping("/oauth2/google")
    public void googleLogin(HttpServletRequest request, HttpServletResponse response) throws Exception {
        oauthLogin("google", request, response);
    }

    @GetMapping("/google/callback")
    public void googleCallback(@RequestParam String code, HttpServletRequest request, HttpServletResponse response) throws Exception {
        oauthCallback("google", code, request, response);
    }

    // ── Session ────────────────────────────────────────────────────────

    @PostMapping("/reload")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AuthResponse> reload() {
        String token = authService.reload();
        return ResponseEntity.ok(new AuthResponse(token));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestParam String invitation, @RequestBody InvitationRegisterRequest request) {
        User user = nominativeInvitationService.completeInvitation(invitation, request.password(), request.name());
        String token = authService.authenticate(user.getUsername(), request.password());
        return ResponseEntity.ok(new AuthResponse(token));
    }

    public record AuthResponse(String token) {
    }

    public record LoginRequest(String email, String password) {
    }

    public record InvitationRegisterRequest(String password, String name) {
    }

    // ── OAuth2 config DTOs ─────────────────────────────────────────────

    public record OAuth2ConfigResponse(List<ProviderConfig> providers) {
    }

    public record ProviderConfig(String name, String displayName, String clientId) {
    }

    // ── Password Reset ─────────────────────────────────────────────────

    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponse> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestPasswordReset(request.email());
        return ResponseEntity.ok(new MessageResponse("Si el email existe, recibirás un enlace para restablecer tu contraseña."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<MessageResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request.token(), request.newPassword());
        return ResponseEntity.ok(new MessageResponse("Contraseña actualizada correctamente."));
    }

    public record ForgotPasswordRequest(String email) {
    }

    public record ResetPasswordRequest(
            @NotBlank String token,
            @NotBlank @Size(min = 6) String newPassword) {
    }

    public record MessageResponse(String message) {
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
