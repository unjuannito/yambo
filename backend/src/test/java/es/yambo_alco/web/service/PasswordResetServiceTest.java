package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.model.PasswordResetToken;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.PasswordResetTokenRepository;
import es.yambo_alco.web.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private MailService mailService;

    @Mock
    private SettingsService settingsService;

    private PasswordResetService passwordResetService;

    @BeforeEach
    void setUp() {
        passwordResetService = new PasswordResetService(
                passwordResetTokenRepository, userRepository, passwordEncoder,
                mailService, settingsService);
        ReflectionTestUtils.setField(passwordResetService, "expirationHours", 2L);
        lenient().when(settingsService.getDomain()).thenReturn("http://localhost:5173");
    }

    // ── requestPasswordReset ────────────────────────────────────────────

    @Test
    void requestPasswordReset_WithExistingEmail_ShouldGenerateTokenAndSendEmail() {
        // Given
        String email = "user@example.com";
        User user = User.builder().email(email).build();
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.findByEmailAndUsedFalse(email)).thenReturn(Collections.emptyList());
        when(passwordResetTokenRepository.save(any(PasswordResetToken.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // When
        passwordResetService.requestPasswordReset(email);

        // Then
        ArgumentCaptor<PasswordResetToken> tokenCaptor = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(passwordResetTokenRepository).save(tokenCaptor.capture());
        PasswordResetToken saved = tokenCaptor.getValue();
        assertThat(saved.getEmail()).isEqualTo(email);
        assertThat(saved.getToken()).isNotBlank();
        assertThat(saved.isUsed()).isFalse();
        assertThat(saved.getExpiresAt()).isAfter(LocalDateTime.now().plusHours(1));

        verify(mailService).sendPasswordResetEmail(
                eq(email),
                anyString(),
                eq(2L));
    }

    @Test
    void requestPasswordReset_WithUnknownEmail_ShouldSilentlyReturn() {
        // Given
        String email = "unknown@example.com";
        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());

        // When
        passwordResetService.requestPasswordReset(email);

        // Then - no token saved, no email sent
        verify(passwordResetTokenRepository, never()).save(any());
        verify(mailService, never()).sendPasswordResetEmail(any(), any(), anyLong());
    }

    @Test
    void requestPasswordReset_ShouldInvalidatePreviousTokens() {
        // Given
        String email = "user@example.com";
        User user = User.builder().email(email).build();
        PasswordResetToken previousToken = PasswordResetToken.builder()
                .email(email).token("old-token").used(false).build();

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.findByEmailAndUsedFalse(email))
                .thenReturn(List.of(previousToken));
        when(passwordResetTokenRepository.save(any(PasswordResetToken.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // When
        passwordResetService.requestPasswordReset(email);

        // Then - previous token should be marked as used
        assertThat(previousToken.isUsed()).isTrue();
        verify(passwordResetTokenRepository).saveAll(List.of(previousToken));
        // New token should also be saved
        verify(passwordResetTokenRepository).save(any(PasswordResetToken.class));
    }

    @Test
    void requestPasswordReset_ShouldBuildCorrectResetLink() {
        // Given
        String email = "user@example.com";
        User user = User.builder().email(email).build();
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.findByEmailAndUsedFalse(email)).thenReturn(Collections.emptyList());
        when(passwordResetTokenRepository.save(any(PasswordResetToken.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // When
        passwordResetService.requestPasswordReset(email);

        // Then
        ArgumentCaptor<String> linkCaptor = ArgumentCaptor.forClass(String.class);
        verify(mailService).sendPasswordResetEmail(eq(email), linkCaptor.capture(), eq(2L));
        String link = linkCaptor.getValue();
        assertThat(link).startsWith("http://localhost:5173/reset-password?token=");
    }

    // ── resetPassword ───────────────────────────────────────────────────

    @Test
    void resetPassword_WithValidToken_ShouldUpdatePasswordAndMarkUsed() {
        // Given
        String token = "valid-token";
        String newPassword = "newPassword123";
        String email = "user@example.com";

        PasswordResetToken resetToken = PasswordResetToken.builder()
                .email(email)
                .token(token)
                .used(false)
                .expiresAt(LocalDateTime.now().plusHours(1))
                .build();

        User user = User.builder().email(email).password("old-encoded").build();

        when(passwordResetTokenRepository.findByToken(token)).thenReturn(Optional.of(resetToken));
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));
        when(passwordEncoder.encode(newPassword)).thenReturn("new-encoded");

        // When
        passwordResetService.resetPassword(token, newPassword);

        // Then
        assertThat(resetToken.isUsed()).isTrue();
        verify(passwordResetTokenRepository).save(resetToken);
        verify(userRepository).save(user);
        assertThat(user.getPassword()).isEqualTo("new-encoded");
    }

    @Test
    void resetPassword_WithInvalidToken_ShouldThrow() {
        // Given
        when(passwordResetTokenRepository.findByToken("invalid")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> passwordResetService.resetPassword("invalid", "password123"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Token inválido");
    }

    @Test
    void resetPassword_WithUsedToken_ShouldThrow() {
        // Given
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .token("used-token")
                .used(true)
                .expiresAt(LocalDateTime.now().plusHours(1))
                .build();
        when(passwordResetTokenRepository.findByToken("used-token")).thenReturn(Optional.of(resetToken));

        // When & Then
        assertThatThrownBy(() -> passwordResetService.resetPassword("used-token", "password123"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("El enlace ya fue utilizado");
    }

    @Test
    void resetPassword_WithExpiredToken_ShouldThrow() {
        // Given
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .token("expired-token")
                .used(false)
                .expiresAt(LocalDateTime.now().minusHours(1))
                .build();
        when(passwordResetTokenRepository.findByToken("expired-token")).thenReturn(Optional.of(resetToken));

        // When & Then
        assertThatThrownBy(() -> passwordResetService.resetPassword("expired-token", "password123"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("El enlace ha expirado");
    }

    @Test
    void resetPassword_WithShortPassword_ShouldThrow() {
        // Given
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .token("valid-token")
                .used(false)
                .expiresAt(LocalDateTime.now().plusHours(1))
                .build();
        when(passwordResetTokenRepository.findByToken("valid-token")).thenReturn(Optional.of(resetToken));

        // When & Then
        assertThatThrownBy(() -> passwordResetService.resetPassword("valid-token", "12345"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("La contraseña debe tener al menos 6 caracteres");
    }

    @Test
    void resetPassword_WithNullPassword_ShouldThrow() {
        // Given
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .token("valid-token")
                .used(false)
                .expiresAt(LocalDateTime.now().plusHours(1))
                .build();
        when(passwordResetTokenRepository.findByToken("valid-token")).thenReturn(Optional.of(resetToken));

        // When & Then
        assertThatThrownBy(() -> passwordResetService.resetPassword("valid-token", null))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("La contraseña debe tener al menos 6 caracteres");
    }

    @Test
    void resetPassword_WithUserNotFound_ShouldThrow() {
        // Given
        String token = "valid-token";
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .email("deleted@example.com")
                .token(token)
                .used(false)
                .expiresAt(LocalDateTime.now().plusHours(1))
                .build();

        when(passwordResetTokenRepository.findByToken(token)).thenReturn(Optional.of(resetToken));
        when(userRepository.findByEmail("deleted@example.com")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> passwordResetService.resetPassword(token, "password123"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Usuario no encontrado");
    }
}
