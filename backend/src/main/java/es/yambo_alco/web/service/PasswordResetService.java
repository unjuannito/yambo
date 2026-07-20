package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.model.PasswordResetToken;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.PasswordResetTokenRepository;
import es.yambo_alco.web.repository.UserRepository;
import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final SettingsService settingsService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${password-reset.expiration.hours:2}")
    private long expirationHours;

    @Transactional
    public void requestPasswordReset(String email) {
        String normalizedEmail = email.toLowerCase().trim();
        Optional<User> userOpt = userRepository.findByEmail(normalizedEmail);
        if (userOpt.isEmpty()) {
            log.info("Password reset requested for unknown email: {}", normalizedEmail);
            return; // Silent return to prevent user enumeration
        }

        // Invalidate any previous unused tokens for this email
        List<PasswordResetToken> previousTokens = passwordResetTokenRepository.findByEmailAndUsedFalse(normalizedEmail);
        for (PasswordResetToken t : previousTokens) {
            t.setUsed(true);
        }
        passwordResetTokenRepository.saveAll(previousTokens);

        // Generate new token
        String token = generateToken();
        LocalDateTime now = LocalDateTime.now();
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .email(normalizedEmail)
                .token(token)
                .createdAt(now)
                .expiresAt(now.plusHours(expirationHours))
                .used(false)
                .build();
        passwordResetTokenRepository.save(resetToken);

        // Send email
        String resetLink = settingsService.getDomain() + "/reset-password?token=" + token;
        mailService.sendPasswordResetEmail(normalizedEmail, resetLink, expirationHours);

        log.info("Password reset token generated for: {}", normalizedEmail);
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(token)
                .orElseThrow(() -> new BadRequestException("Token inválido"));

        if (resetToken.isUsed()) {
            throw new BadRequestException("El enlace ya fue utilizado");
        }

        if (resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("El enlace ha expirado");
        }

        if (newPassword == null || newPassword.length() < 6) {
            throw new BadRequestException("La contraseña debe tener al menos 6 caracteres");
        }

        User user = userRepository.findByEmail(resetToken.getEmail())
                .orElseThrow(() -> new BadRequestException("Usuario no encontrado"));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);

        log.info("Password successfully reset for: {}", resetToken.getEmail());
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
