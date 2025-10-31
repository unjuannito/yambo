package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.Invitation;
import es.yambo_alco.web.model.Role;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.InvitationRepository;
import es.yambo_alco.web.repository.RoleRepository;
import es.yambo_alco.web.repository.UserRepository;
import es.yambo_alco.web.util.IdGenerator;
import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

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
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${invitation.expiration.hours:72}")
    private long expirationHours;

    public Invitation createInvitation(String email, String name, String invitedBy, Set<String> roleIds) {
        // Check if email is already registered
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email already registered");
        }

        // Validate roles exist
        Set<Role> roles = Set.of();
        if (roleIds != null && !roleIds.isEmpty()) {
            roles = Set.copyOf(roleRepository.findAllById(roleIds));
            if (roles.size() != roleIds.size()) {
                throw new BadRequestException("One or more roles not found");
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
                .roles(roles)
                .build();
        Invitation saved = invitationRepository.save(inv);

        String link = buildInvitationLink(token);
        String subject = "Invitación a Yambo";
        String body = "Has sido invitado a registrarte en Yambo. Usa este enlace: " + link + "\nEl enlace expira en " + expirationHours + " horas.";
        mailService.sendInvitation(email, subject, body);

        return saved;
    }

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

        // Use roles from invitation, or default roles from configuration if none specified
        // Create a new HashSet to avoid shared collection references between entities
        Set<Role> userRoles;
        if (invitation.getRoles() != null && !invitation.getRoles().isEmpty()) {
            userRoles = new HashSet<>(invitation.getRoles());
        } else {
            userRoles = getDefaultRoles();
        }

        // Generate unique user ID
        String userId = IdGenerator.generateUniqueId(userRepository::existsById);

        User user = User.builder()
                .id(userId)
                .password(passwordEncoder.encode(password))
                .email(invitation.getEmail())
                .name(name)
                .roles(userRoles)
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

    private Set<Role> getDefaultRoles() {
        List<Role> defaultRoles = roleRepository.findByIsDefaultTrue();
        
        if (defaultRoles.isEmpty()) {
            throw new ResourceNotFoundException("No default roles found. Please mark at least one role as default in the database.");
        }
        
        return new HashSet<>(defaultRoles);
    }
}
