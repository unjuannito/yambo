package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.model.Invitation;
import es.yambo_alco.web.model.InvitationRegistration;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.InvitationType;
import es.yambo_alco.web.repository.ProfileRepository;
import es.yambo_alco.web.repository.InvitationRegistrationRepository;
import es.yambo_alco.web.repository.InvitationRepository;
import es.yambo_alco.web.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Base64;
import java.util.HashSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class InvitationService {

    private final InvitationRepository invitationRepository;
    private final InvitationRegistrationRepository invitationRegistrationRepository;
    private final ProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AccessGrantService accessGrantService;

    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public Invitation createInvitation(String invitedBy, Set<String> profileIds, LocalDateTime startTms, LocalDateTime endTms) {
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

        Invitation invitation = Invitation.builder()
                .token(generateToken())
            .createdAt(LocalDateTime.now())
            .startTms(start)
                .expiresAt(endTms)
                .invitedBy(invitedBy)
                .profiles(profiles)
                .build();

        return invitationRepository.save(invitation);
    }

    @Transactional
    public User acceptInvitation(String token, String email, String password, String name, User currentUser) {
        Invitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation not found"));

        LocalDateTime now = LocalDateTime.now();
        if (invitation.getStartTms() != null && invitation.getStartTms().isAfter(now)) {
            throw new BadRequestException("Invitation not active yet");
        }
        if (invitation.getExpiresAt() != null && invitation.getExpiresAt().isBefore(now)) {
            throw new BadRequestException("Invitation expired");
        }

        Set<Profile> invitationProfiles = invitation.getProfiles();

        User user;
        if (currentUser != null) {
            user = currentUser;
        } else {
            if (email == null || email.isBlank() || password == null || password.isBlank() || name == null || name.isBlank()) {
                throw new BadRequestException("Email, password and name are required");
            }
            // Someone added without an account who registers with the same email keeps that user
            Optional<User> pending = userRepository.findPendingAccountByEmail(email);
            if (pending.isEmpty() && userRepository.existsByEmail(email)) {
                throw new BadRequestException("Email already registered");
            }
            if (pending.isPresent()) {
                user = pending.get();
                user.activateAccount(passwordEncoder.encode(password));
            } else {
                user = User.builder()
                        .email(email)
                        .password(passwordEncoder.encode(password))
                        .name(name)
                        .createdAt(LocalDateTime.now())
                        .enabled(true)
                        .profiles(new HashSet<>())
                        .build();
            }
            user = userRepository.save(user);
        }

        if (user.getProfiles() == null) {
            user.setProfiles(new HashSet<>());
        }
        user.getProfiles().addAll(invitationProfiles);
        userRepository.save(user);

        if (!invitationRegistrationRepository.existsByInvitationIdAndUserId(invitation.getId(), user.getId())) {
            InvitationRegistration registration = InvitationRegistration.builder()
                    .invitationId(invitation.getId())
                    .userId(user.getId())
                    .registeredAt(LocalDateTime.now())
                    .build();
            invitationRegistrationRepository.save(registration);
        }

        // Historial: perfiles obtenidos a través de esta invitación (origen INVITATION/LINK)
        accessGrantService.recordInvitationProfileGrants(
                user.getId(), invitation.getId(), InvitationType.LINK,
                invitationProfiles, invitation.getInvitedBy());

        return user;
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public java.util.List<Invitation> getAllInvitations() {
        return invitationRepository.findAll();
    }

    public java.util.List<Invitation> getInvitationsSince(java.time.LocalDateTime startDate) {
        if (startDate == null) {
            return invitationRepository.findAll();
        }
        return invitationRepository.findByCreatedAtGreaterThanEqual(startDate);
    }

    @Transactional
    public Invitation disableInvitation(Long id) {
        Invitation invitation = invitationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation not found"));
        invitation.setExpiresAt(LocalDateTime.now());
        return invitationRepository.save(invitation);
    }

    /** Beneficiarios de una invitación LINK: usuarios que se registraron con ella. */
    public java.util.List<InvitationRegistrationDto> getRegistrations(Long invitationId) {
        return invitationRegistrationRepository.findByInvitationIdOrderByRegisteredAtDesc(invitationId)
                .stream()
                .map(reg -> {
                    String name = userRepository.findById(reg.getUserId())
                            .map(User::getName)
                            .orElse(null);
                    return new InvitationRegistrationDto(
                            reg.getUserId(), name, reg.getRegisteredAt());
                })
                .toList();
    }

    /** DTO de beneficiario de invitación (para la tabla de invitaciones). */
    @lombok.Data
    @lombok.AllArgsConstructor
    public static class InvitationRegistrationDto {
        private String userId;
        private String name;
        private java.time.LocalDateTime registeredAt;
    }
}
