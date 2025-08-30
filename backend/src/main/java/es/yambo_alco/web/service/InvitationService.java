package es.yambo_alco.web.service;

import es.yambo_alco.web.model.Invitation;
import es.yambo_alco.web.repository.InvitationRepository;
import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class InvitationService {

    private final InvitationRepository invitationRepository;
    private final MailService mailService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${invitation.expiration.hours:72}")
    private long expirationHours;

    public Invitation createInvitation(String email, Long invitedBy) {
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
