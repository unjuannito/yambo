package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.*;
import es.yambo_alco.web.model.enums.UserProjectGroupRole;
import es.yambo_alco.web.repository.FamilyProductRepository;
import es.yambo_alco.web.repository.ParentInvitationRepository;
import es.yambo_alco.web.repository.ProjectGroupRepository;
import es.yambo_alco.web.repository.UserProjectGroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ParentInvitationService {

    private final ParentInvitationRepository parentInvitationRepository;
    private final FamilyProductRepository familyProductRepository;
    private final ProjectGroupRepository projectGroupRepository;
    private final UserProjectGroupRepository userProjectGroupRepository;
    private final UserService userService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public ParentInvitation createInvitation(String familyProductId, String createdBy,
                                              String email, LocalDateTime expiresAt) {
        FamilyProduct product = familyProductRepository.findById(familyProductId)
                .orElseThrow(() -> new ResourceNotFoundException("Family product not found"));

        String token = generateToken();
        LocalDateTime now = LocalDateTime.now();

        ParentInvitation inv = ParentInvitation.builder()
                .token(token)
                .familyProductId(familyProductId)
                .email(email != null ? email.toLowerCase().trim() : null)
                .createdBy(createdBy)
                .createdAt(now)
                .expiresAt(expiresAt)
                .build();

        return parentInvitationRepository.save(inv);
    }

    @Transactional
    public void acceptInvitation(String token, User currentUser) {
        ParentInvitation invitation = parentInvitationRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Parent invitation not found"));

        if (invitation.isUsed()) {
            throw new BadRequestException("This invitation has already been used");
        }

        if (invitation.isExpired()) {
            throw new BadRequestException("This invitation has expired");
        }

        // Get the family product's roleAccess to find which projects need PARENT
        FamilyProduct product = familyProductRepository.findById(invitation.getFamilyProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Family product not found"));

        if (product.getRoleAccess() == null || product.getRoleAccess().isEmpty()) {
            throw new BadRequestException("This family product has no role access configured");
        }

        // Assign PARENT role for each project that has PARENT in its roleAccess
        boolean assigned = false;
        for (FamilyProductRoleAccess ra : product.getRoleAccess()) {
            if (ra.getRole() == UserProjectGroupRole.PARENT) {
                ProjectGroup projectGroup = projectGroupRepository
                        .findByProjectIdAndNameIsNull(ra.getProjectId())
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Project-level group not found for project: " + ra.getProjectId()));

                userService.assignGroupRole(currentUser.getId(), projectGroup.getId(),
                        UserProjectGroupRole.PARENT);
                assigned = true;
            }
        }

        if (!assigned) {
            throw new BadRequestException("This family product does not allow parent access");
        }

        // Mark invitation as used
        invitation.setUsedByUserId(currentUser.getId());
        invitation.setUsedAt(LocalDateTime.now());
        parentInvitationRepository.save(invitation);
    }

    public List<ParentInvitation> getInvitations(String familyProductId) {
        if (familyProductId != null && !familyProductId.isBlank()) {
            return parentInvitationRepository.findByFamilyProductId(familyProductId);
        }
        return parentInvitationRepository.findAll();
    }

    @Transactional
    public void deleteInvitation(Long id) {
        ParentInvitation invitation = parentInvitationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Parent invitation not found"));

        if (invitation.isUsed()) {
            throw new BadRequestException("Cannot delete a used invitation");
        }

        parentInvitationRepository.delete(invitation);
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return "parent_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public String buildInvitationLink(String token, String domain) {
        return domain + "/parent-invitation/" + token;
    }

    public String getFamilyProductName(String familyProductId) {
        return familyProductRepository.findById(familyProductId)
                .map(FamilyProduct::getName)
                .orElse("Unknown");
    }

    @Transactional
    public int revokeAllParentRoles(String familyProductId) {
        FamilyProduct product = familyProductRepository.findById(familyProductId)
                .orElseThrow(() -> new ResourceNotFoundException("Family product not found"));

        if (product.getRoleAccess() == null || product.getRoleAccess().isEmpty()) {
            return 0;
        }

        int total = 0;
        for (FamilyProductRoleAccess ra : product.getRoleAccess()) {
            if (ra.getRole() == UserProjectGroupRole.PARENT) {
                ProjectGroup projectGroup = projectGroupRepository
                        .findByProjectIdAndNameIsNull(ra.getProjectId())
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Project-level group not found for project: " + ra.getProjectId()));

                List<es.yambo_alco.web.model.UserProjectGroup> parents =
                        userProjectGroupRepository.findByProjectGroupIdAndRole(
                                projectGroup.getId(), UserProjectGroupRole.PARENT);

                if (!parents.isEmpty()) {
                    userProjectGroupRepository.deleteAll(parents);
                    total += parents.size();
                }
            }
        }
        return total;
    }
}
