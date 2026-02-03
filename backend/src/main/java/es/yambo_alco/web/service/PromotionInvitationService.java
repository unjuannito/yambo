package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.model.PromotionInvitation;
import es.yambo_alco.web.model.PromotionInvitationRegistration;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.ProfileRepository;
import es.yambo_alco.web.repository.PromotionInvitationRegistrationRepository;
import es.yambo_alco.web.repository.PromotionInvitationRepository;
import es.yambo_alco.web.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HashSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PromotionInvitationService {

    private final PromotionInvitationRepository promotionInvitationRepository;
    private final PromotionInvitationRegistrationRepository promotionInvitationRegistrationRepository;
    private final ProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public PromotionInvitation createPromotionInvitation(String invitedBy, Set<String> profileIds, LocalDateTime startTms, LocalDateTime endTms) {
        if (profileIds == null || profileIds.isEmpty()) {
            throw new BadRequestException("Profile IDs are required");
        }

        LocalDateTime start = startTms != null ? startTms : LocalDateTime.now();
        if (endTms != null && start.isAfter(endTms)) {
            throw new BadRequestException("Start date must be before end date");
        }

        Set<Profile> profiles = Set.copyOf(profileRepository.findAllById(profileIds));
        if (profiles.size() != profileIds.size()) {
            throw new BadRequestException("One or more profiles not found");
        }

        PromotionInvitation invitation = PromotionInvitation.builder()
                .token(generateToken())
            .createdAt(LocalDateTime.now())
            .startTms(start)
                .expiresAt(endTms)
                .invitedBy(invitedBy)
                .profiles(profiles)
                .build();

        return promotionInvitationRepository.save(invitation);
    }

    @Transactional
    public User acceptInvitation(String token, String email, String password, String name, User currentUser) {
        PromotionInvitation invitation = promotionInvitationRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Promotion invitation not found"));

        LocalDateTime now = LocalDateTime.now();
        if (invitation.getStartTms() != null && invitation.getStartTms().isAfter(now)) {
            throw new BadRequestException("Promotion invitation not active yet");
        }
        if (invitation.getExpiresAt() != null && invitation.getExpiresAt().isBefore(now)) {
            throw new BadRequestException("Promotion invitation expired");
        }

        Set<Profile> invitationProfiles = invitation.getProfiles();

        User user;
        if (currentUser != null) {
            user = currentUser;
        } else {
            if (email == null || email.isBlank() || password == null || password.isBlank() || name == null || name.isBlank()) {
                throw new BadRequestException("Email, password and name are required");
            }
            if (userRepository.existsByEmail(email)) {
                throw new BadRequestException("Email already registered");
            }
            user = User.builder()
                    .email(email)
                    .password(passwordEncoder.encode(password))
                    .name(name)
                    .createdAt(LocalDateTime.now())
                    .enabled(true)
                    .profiles(new HashSet<>())
                    .build();
            user = userRepository.save(user);
        }

        if (user.getProfiles() == null) {
            user.setProfiles(new HashSet<>());
        }
        user.getProfiles().addAll(invitationProfiles);
        userRepository.save(user);

        if (!promotionInvitationRegistrationRepository.existsByPromotionInvitationIdAndUserId(invitation.getId(), user.getId())) {
            PromotionInvitationRegistration registration = PromotionInvitationRegistration.builder()
                    .promotionInvitationId(invitation.getId())
                    .userId(user.getId())
                    .registeredAt(LocalDateTime.now())
                    .build();
            promotionInvitationRegistrationRepository.save(registration);
        }

        return user;
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public java.util.List<PromotionInvitation> getAllInvitations() {
        return promotionInvitationRepository.findAll();
    }

    @Transactional
    public PromotionInvitation disableInvitation(Long id) {
        PromotionInvitation invitation = promotionInvitationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Promotion invitation not found"));
        invitation.setExpiresAt(LocalDateTime.now());
        return promotionInvitationRepository.save(invitation);
    }
}
