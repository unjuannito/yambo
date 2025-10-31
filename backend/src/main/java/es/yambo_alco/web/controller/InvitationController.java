package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.Invitation;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.InvitationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/invitations")
@RequiredArgsConstructor
public class InvitationController {

    private final InvitationService invitationService;

    private final AuthService authService;

    private final UserRepository userRepository;

    @PostMapping
    @PreAuthorize("hasAuthority('INVITE_USERS')")
    public ResponseEntity<InvitationResponse> createInvitation(@Valid @RequestBody InvitationRequest req, Authentication authentication) {
        User user = authService.getCurrentUser(true);

        Invitation inv = invitationService.createInvitation(req.getEmail(), req.getName(), user.getId(), req.getRoleIds());
        
        UserInfo invitedByUser = null;
        if (inv.getInvitedBy() != null) {
            invitedByUser = userRepository.findById(inv.getInvitedBy())
                    .map(u -> new UserInfo(u.getId(), u.getName(), u.getEmail()))
                    .orElse(null);
        }
        
        InvitationResponse res = new InvitationResponse(
                inv.getId(), 
                inv.getEmail(), 
                inv.getToken(), 
                inv.getCreatedAt(), 
                inv.getExpiresAt(), 
                inv.isUsed(), 
                inv.getInvitedBy(),
                invitedByUser,
                inv.getRoles().stream().map(r -> r.getId()).collect(Collectors.toSet())
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(res);
    }

    @GetMapping
    @PreAuthorize("hasAuthority('INVITE_USERS')")
    public ResponseEntity<List<InvitationResponse>> getAllInvitations() {
        List<Invitation> invitations = invitationService.getAllInvitations();
        List<InvitationResponse> response = invitations.stream()
                .map(inv -> {
                    UserInfo invitedByUser = null;
                    if (inv.getInvitedBy() != null) {
                        invitedByUser = userRepository.findById(inv.getInvitedBy())
                                .map(u -> new UserInfo(u.getId(), u.getName(), u.getEmail()))
                                .orElse(null);
                    }
                    
                    return new InvitationResponse(
                            inv.getId(), 
                            inv.getEmail(), 
                            inv.getToken(), 
                            inv.getCreatedAt(), 
                            inv.getExpiresAt(), 
                            inv.isUsed(), 
                            inv.getInvitedBy(),
                            invitedByUser,
                            inv.getRoles().stream().map(r -> r.getId()).collect(Collectors.toSet())
                    );
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('INVITE_USERS')")
    public ResponseEntity<String> deleteInvitation(@PathVariable Long id) {
        invitationService.deleteInvitation(id);
        return ResponseEntity.ok("Invitation deleted successfully");
    }

    @Data
    public static class InvitationRequest {
        @NotBlank
        @Email
        private String email;

        @NotBlank
        private String name;

        private Set<String> roleIds;
    }

    @Data
    public static class InvitationResponse {
        private Long id;
        private String email;
        private String token;
        private LocalDateTime createdAt;
        private LocalDateTime expiresAt;
        private boolean used;
        private String invitedBy;
        private UserInfo invitedByUser;
        private Set<String> roleIds;

        public InvitationResponse(Long id, String email, String token, LocalDateTime createdAt, LocalDateTime expiresAt, boolean used, String invitedBy, UserInfo invitedByUser, Set<String> roleIds) {
            this.id = id;
            this.email = email;
            this.token = token;
            this.createdAt = createdAt;
            this.expiresAt = expiresAt;
            this.used = used;
            this.invitedBy = invitedBy;
            this.invitedByUser = invitedByUser;
            this.roleIds = roleIds;
        }
    }

    @Data
    public static class UserInfo {
        private String id;
        private String name;
        private String email;

        public UserInfo(String id, String name, String email) {
            this.id = id;
            this.name = name;
            this.email = email;
        }
    }
}
