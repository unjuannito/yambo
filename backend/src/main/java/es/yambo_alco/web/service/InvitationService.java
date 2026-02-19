package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.Invitation;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.InvitationRepository;
import es.yambo_alco.web.repository.ProfileRepository;
import es.yambo_alco.web.repository.UserRepository;
import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class InvitationService {

    private final InvitationRepository invitationRepository;
    private final ProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final SettingsService settingsService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${invitation.expiration.hours:72}")
    private long expirationHours;

    public Invitation createInvitation(String email, String invitedBy, Set<String> profileIds) {
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email already registered");
        }

        Set<Profile> profiles = Set.of();
        if (profileIds != null && !profileIds.isEmpty()) {
            profiles = Set.copyOf(profileRepository.findAllById(profileIds));
            if (profiles.size() != profileIds.size()) {
                throw new BadRequestException("One or more profiles not found");
            }
        }

        String token = generateToken();
        LocalDateTime now = LocalDateTime.now();
        Invitation inv = Invitation.builder()
                .email(email)
                .token(token)
                .createdAt(now)
                .expiresAt(now.plusHours(expirationHours))
                .used(false)
                .invitedBy(invitedBy)
                .profiles(profiles)
                .build();

        String link = buildInvitationLink(token);
        String orgName = settingsService.getOrganizationName();
        String subject = "Invitación a " + orgName;
        String body = "Has sido invitado a registrarte en " + orgName + ". Usa este enlace: " + link + "\nEl enlace expira en "
                + expirationHours + " horas.";
        mailService.sendInvitation(email, subject, body);

        return invitationRepository.save(inv);
    }

    @Transactional
    public User completeInvitation(String token, String password, String name) {
        Invitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation not found"));

        if (invitation.isUsed()) {
            throw new BadRequestException("Invitation already used");
        }

        if (invitation.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Invitation expired");
        }

        if (userRepository.existsByEmail(invitation.getEmail())) {
            throw new BadRequestException("Email already registered");
        }

        invitation.setUsed(true);
        invitationRepository.save(invitation);

        User user = User.builder()
                .email(invitation.getEmail())
                .password(passwordEncoder.encode(password))
                .name(name)
                .createdAt(LocalDateTime.now())
                .enabled(true)
                .profiles(new HashSet<>(invitation.getProfiles()))
                .build();

        return userRepository.save(user);
    }

    private String buildInvitationLink(String token) {
        String frontend = settingsService.getDomain();
        return frontend + "/register?invitation=" + token;
    }

    public List<Invitation> getAllInvitations() {
        return invitationRepository.findAll();
    }

    public void deleteInvitation(Long id) {
        Invitation invitation = invitationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation not found"));

        invitationRepository.delete(invitation);
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
