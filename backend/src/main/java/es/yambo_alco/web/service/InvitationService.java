package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.Invitation;
import es.yambo_alco.web.model.Role;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.InvitationRepository;
import es.yambo_alco.web.repository.RoleRepository;
import es.yambo_alco.web.repository.UserRepository;
import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class InvitationService {

    private final InvitationRepository invitationRepository;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${invitation.expiration.hours:72}")
    private long expirationHours;

    public Invitation createInvitation(String email, String name, Long invitedBy) {
        String token = generateToken();
        LocalDateTime now = LocalDateTime.now();
        Invitation inv = Invitation.builder()
                .email(email)
                .token(token)
                .createdAt(now)
                .expiresAt(now.plusHours(expirationHours))
                .used(false)
                .invitedBy(invitedBy)
                .build();
        Invitation saved = invitationRepository.save(inv);

        String link = buildInvitationLink(token);
        String subject = "Invitación a Yambo";
        String body = "Has sido invitado a registrarte en Yambo. Usa este enlace: " + link + "\nEl enlace expira en " + expirationHours + " horas.";
        mailService.sendInvitation(email, subject, body);

        return saved;
    }

    public User completeInvitation(String token, String username, String password, String name) {
        Invitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation not found"));

        if (invitation.isUsed()) {
            throw new BadRequestException("Invitation already used");
        }

        if (invitation.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Invitation expired");
        }

        if (userRepository.existsByUsername(username)) {
            throw new BadRequestException("Username already exists");
        }

        if (userRepository.existsByEmail(invitation.getEmail())) {
            throw new BadRequestException("Email already registered");
        }

        Role defaultRole = roleRepository.findById("ROLE_USER")
                .orElseThrow(() -> new ResourceNotFoundException("Default role not found"));

        User user = User.builder()
                .username(username)
                .password(passwordEncoder.encode(password))
                .email(invitation.getEmail())
                .name(name)
                .roles(Set.of(defaultRole))
                .createdAt(LocalDateTime.now())
                .enabled(true)
                .build();

        User savedUser = userRepository.save(user);

        invitation.setUsed(true);
        invitationRepository.save(invitation);

        return savedUser;
    }

    private String buildInvitationLink(String token) {
        String frontend = System.getenv().getOrDefault("FRONTEND_URL", "http://localhost:5173");
        return frontend + "/register?invitation=" + token;
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
