package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.NominativeInvitation;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.InvitationType;
import es.yambo_alco.web.repository.NominativeInvitationRepository;
import es.yambo_alco.web.repository.ProfileRepository;
import es.yambo_alco.web.repository.UserRepository;
import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class NominativeInvitationService {

    private final NominativeInvitationRepository nominativeInvitationRepository;
    private final ProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final SettingsService settingsService;
    private final AccessGrantService accessGrantService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${invitation.expiration.hours:72}")
    private long expirationHours;

    public NominativeInvitation createInvitation(String email, String invitedBy, Set<String> profileIds) {
        String normalizedEmail = email.toLowerCase().trim();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new BadRequestException("Email already registered");
        }

        Set<Profile> profiles = resolveProfiles(profileIds);

        String token = generateToken();
        LocalDateTime now = LocalDateTime.now();
        NominativeInvitation inv = NominativeInvitation.builder()
                .email(normalizedEmail)
                .token(token)
                .createdAt(now)
                .expiresAt(now.plusHours(expirationHours))
                .used(false)
                .invitedBy(invitedBy)
                .profiles(profiles)
                .build();

        sendInvitationEmail(normalizedEmail, token, expirationHours);

        return nominativeInvitationRepository.save(inv);
    }

    public void sendInvitationEmail(String email, String token, long hours) {
        String link = buildInvitationLink(token);
        String orgName = settingsService.getOrganizationName();
        String subject = "Invitación a " + orgName;
        String body = "Has sido invitado a registrarte en " + orgName + ". Usa este enlace: " + link
                + "\nEl enlace expira en " + hours + " horas.";
        mailService.sendInvitation(email, subject, body);
    }

    @Transactional
    public List<NominativeInvitation> createBatchInvitations(List<String> emails, String invitedBy, Set<String> profileIds) {
        Set<Profile> profiles = resolveProfiles(profileIds);

        List<NominativeInvitation> invitations = new ArrayList<>();
        List<String> skipped = new ArrayList<>();

        for (String email : emails) {
            String normalizedEmail = email.toLowerCase().trim();
            if (userRepository.existsByEmail(normalizedEmail)) {
                skipped.add(email);
                continue;
            }

            String token = generateToken();
            LocalDateTime now = LocalDateTime.now();
            NominativeInvitation inv = NominativeInvitation.builder()
                    .email(normalizedEmail)
                    .token(token)
                    .createdAt(now)
                    .expiresAt(now.plusHours(expirationHours))
                    .used(false)
                    .invitedBy(invitedBy)
                    .profiles(profiles)
                    .build();

            invitations.add(nominativeInvitationRepository.save(inv));
        }

        return invitations;
    }

    private Set<Profile> resolveProfiles(Set<String> profileIds) {
        if (profileIds == null || profileIds.isEmpty()) {
            return Set.of();
        }
        Set<Profile> profiles = Set.copyOf(profileRepository.findAllById(profileIds));
        if (profiles.size() != profileIds.size()) {
            throw new BadRequestException("One or more profiles not found");
        }
        return profiles;
    }

    @Transactional
    public User completeInvitation(String token, String password, String name) {
        NominativeInvitation invitation = nominativeInvitationRepository.findByToken(token)
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

        User user = User.builder()
                .email(invitation.getEmail())
                .password(passwordEncoder.encode(password))
                .name(name)
                .createdAt(LocalDateTime.now())
                .enabled(true)
                .profiles(new HashSet<>(invitation.getProfiles()))
                .build();

        User saved = userRepository.save(user);

        // Quién usó la invitación y cuándo (link beneficiario) — un único save con todo
        invitation.setUsedByUserId(saved.getId());
        invitation.setUsedAt(LocalDateTime.now());
        nominativeInvitationRepository.save(invitation);
        // Historial: perfiles obtenidos a través de esta invitación (origen INVITATION/NOMINATIVE)
        accessGrantService.recordInvitationProfileGrants(
                saved.getId(), invitation.getId(), InvitationType.NOMINATIVE,
                invitation.getProfiles(), invitation.getInvitedBy());

        return saved;
    }

    private String buildInvitationLink(String token) {
        String frontend = settingsService.getDomain();
        return frontend + "/register?invitation=" + token;
    }

    public List<NominativeInvitation> getAllInvitations() {
        return nominativeInvitationRepository.findAll();
    }

    public List<NominativeInvitation> getInvitationsSince(java.time.LocalDateTime startDate) {
        if (startDate == null) {
            return nominativeInvitationRepository.findAll();
        }
        return nominativeInvitationRepository.findByCreatedAtGreaterThanEqual(startDate);
    }

    public void deleteInvitation(Long id) {
        NominativeInvitation invitation = nominativeInvitationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation not found"));

        nominativeInvitationRepository.delete(invitation);
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
