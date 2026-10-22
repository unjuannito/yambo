package es.yambo_alco.web.service.oauth;

import com.fasterxml.jackson.databind.ObjectMapper;
import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.UserRepository;
import es.yambo_alco.web.service.SettingsService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class GoogleOAuthProvider implements OAuthProvider {

    private static final Logger log = LoggerFactory.getLogger(GoogleOAuthProvider.class);

    private final UserRepository userRepository;
    private final SettingsService settingsService;

    private static final String TOKEN_URI = "https://oauth2.googleapis.com/token";
    private static final String USER_INFO_URI = "https://www.googleapis.com/oauth2/v3/userinfo";
    private static final String AUTH_URI = "https://accounts.google.com/o/oauth2/auth";
    private static final String SETTINGS_PREFIX = "oauth.google.";

    @Override
    public String getProviderName() { return "google"; }

    @Override
    public String getDisplayName() { return "Google"; }

    @Override
    public boolean isEnabled() {
        return "true".equalsIgnoreCase(settingsService.getSettingValue(SETTINGS_PREFIX + "enabled", "false"));
    }

    @Override
    public String getClientId() {
        return settingsService.getSettingValue(SETTINGS_PREFIX + "client_id", "");
    }

    @Override
    public String getClientSecret() {
        return settingsService.getSettingValue(SETTINGS_PREFIX + "client_secret", "");
    }

    @Override
    public String buildAuthUrl(String redirectUri) {
        String clientId = getClientId();
        if (clientId.isEmpty()) {
            throw new IllegalStateException("Google OAuth is not configured");
        }
        return AUTH_URI
            + "?client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8)
            + "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8)
            + "&response_type=code"
            + "&scope=" + URLEncoder.encode("openid email profile", StandardCharsets.UTF_8)
            + "&access_type=offline"
            + "&prompt=consent";
    }

    @Override
    @Transactional
    public User processCallback(String authorizationCode, String redirectUri) throws Exception {
        String clientId = getClientId();
        String clientSecret = getClientSecret();
        if (clientId.isEmpty() || clientSecret.isEmpty()) {
            throw new IllegalStateException("Google OAuth is not configured");
        }

        String tokenResponse = exchangeCodeForToken(authorizationCode, redirectUri, clientId, clientSecret);
        ObjectMapper mapper = new ObjectMapper();
        Map<String, Object> tokenData = mapper.readValue(tokenResponse, Map.class);
        String accessToken = (String) tokenData.get("access_token");

        String userInfoResponse = getUserInfo(accessToken);
        Map<String, Object> userInfo = mapper.readValue(userInfoResponse, Map.class);

        String email = ((String) userInfo.get("email")).toLowerCase();
        String name = (String) userInfo.get("name");

        log.info("Google OAuth login: email={}", email);
        return findExistingUser(email, name);
    }

    private User findExistingUser(String email, String name) {
        return userRepository.findByEmail(email)
                .map(user -> {
                    if (!user.isHasAccount()) {
                        // Added without an account: signing in with Google is what creates it.
                        // The name set by the admin is the public one, so it is kept.
                        user.setHasAccount(true);
                    } else if (name != null && !name.isBlank()) {
                        user.setName(name);
                    }
                    user.setLastLoginAt(LocalDateTime.now());
                    log.info("Linked Google account to existing user: {}", email);
                    return userRepository.save(user);
                })
                .orElseThrow(() -> {
                    log.warn("Rejected Google OAuth login for unknown email: {}", email);
                    return new BadRequestException(
                        "No hay ninguna cuenta de Yambo asociada a este correo. "
                        + "Solicita una invitación para acceder al área de socios."
                    );
                });
    }

    private String exchangeCodeForToken(String code, String redirectUri, String clientId, String clientSecret) throws Exception {
        String body = "code=" + URLEncoder.encode(code, StandardCharsets.UTF_8)
            + "&client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8)
            + "&client_secret=" + URLEncoder.encode(clientSecret, StandardCharsets.UTF_8)
            + "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8)
            + "&grant_type=authorization_code";
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(java.net.URI.create(TOKEN_URI))
            .header("Content-Type", "application/x-www-form-urlencoded")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        return response.body();
    }

    private String getUserInfo(String accessToken) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(java.net.URI.create(USER_INFO_URI))
            .header("Authorization", "Bearer " + accessToken)
            .GET()
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        return response.body();
    }
}
