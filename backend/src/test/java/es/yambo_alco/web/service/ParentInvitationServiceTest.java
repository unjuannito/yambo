package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.*;
import es.yambo_alco.web.model.enums.UserProjectGroupRole;
import es.yambo_alco.web.repository.FamilyProductRepository;
import es.yambo_alco.web.repository.ParentInvitationRepository;
import es.yambo_alco.web.repository.ProjectGroupRepository;
import es.yambo_alco.web.repository.UserProjectGroupRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ParentInvitationServiceTest {

    @Mock
    private ParentInvitationRepository parentInvitationRepository;

    @Mock
    private FamilyProductRepository familyProductRepository;

    @Mock
    private ProjectGroupRepository projectGroupRepository;

    @Mock
    private UserProjectGroupRepository userProjectGroupRepository;

    @Mock
    private UserService userService;

    private ParentInvitationService parentInvitationService;

    private static final String PROJECT_ID = "P0000001";
    private static final String FAMILY_PRODUCT_ID = "FP000001";
    private static final String USER_ID = "U0000001";
    private static final String PROJECT_GROUP_ID = "PG000001";

    @BeforeEach
    void setUp() {
        parentInvitationService = new ParentInvitationService(
                parentInvitationRepository, familyProductRepository,
                projectGroupRepository, userProjectGroupRepository, userService);
    }

    // ── createInvitation ──────────────────────────────────────────────

    @Test
    void createInvitation_ShouldCreateAndReturnInvitation() {
        String familyProductId = FAMILY_PRODUCT_ID;
        String createdBy = USER_ID;

        FamilyProduct product = FamilyProduct.builder().id(familyProductId).name("Drop Test").build();
        when(familyProductRepository.findById(familyProductId)).thenReturn(Optional.of(product));
        when(parentInvitationRepository.save(any(ParentInvitation.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ParentInvitation result = parentInvitationService.createInvitation(
                familyProductId, createdBy, null, null);

        assertThat(result).isNotNull();
        assertThat(result.getToken()).startsWith("parent_");
        assertThat(result.getFamilyProductId()).isEqualTo(familyProductId);
        assertThat(result.getCreatedBy()).isEqualTo(createdBy);
        assertThat(result.getEmail()).isNull();
        assertThat(result.isUsed()).isFalse();
        assertThat(result.getExpiresAt()).isNull();

        verify(familyProductRepository).findById(familyProductId);
        verify(parentInvitationRepository).save(any(ParentInvitation.class));
    }

    @Test
    void createInvitation_WithEmail_ShouldNormalizeAndStore() {
        String email = "Test@Example.COM";
        when(familyProductRepository.findById(FAMILY_PRODUCT_ID))
                .thenReturn(Optional.of(FamilyProduct.builder().id(FAMILY_PRODUCT_ID).build()));
        when(parentInvitationRepository.save(any(ParentInvitation.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ParentInvitation result = parentInvitationService.createInvitation(
                FAMILY_PRODUCT_ID, USER_ID, email, null);

        assertThat(result.getEmail()).isEqualTo("test@example.com");
    }

    @Test
    void createInvitation_WithExpiresAt_ShouldSetExpiration() {
        LocalDateTime expiresAt = LocalDateTime.now().plusDays(7);
        when(familyProductRepository.findById(FAMILY_PRODUCT_ID))
                .thenReturn(Optional.of(FamilyProduct.builder().id(FAMILY_PRODUCT_ID).build()));
        when(parentInvitationRepository.save(any(ParentInvitation.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ParentInvitation result = parentInvitationService.createInvitation(
                FAMILY_PRODUCT_ID, USER_ID, null, expiresAt);

        assertThat(result.getExpiresAt()).isEqualTo(expiresAt);
    }

    @Test
    void createInvitation_WithInvalidFamilyProduct_ShouldThrow() {
        when(familyProductRepository.findById("INVALID")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> parentInvitationService.createInvitation(
                "INVALID", USER_ID, null, null))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Family product not found");

        verify(parentInvitationRepository, never()).save(any());
    }

    // ── acceptInvitation ──────────────────────────────────────────────

    @Test
    void acceptInvitation_ShouldAssignParentRoleAndMarkUsed() {
        String token = "parent_token123";
        User currentUser = User.builder().id(USER_ID).name("Test Parent").build();
        LocalDateTime now = LocalDateTime.now();

        ParentInvitation invitation = ParentInvitation.builder()
                .id(1L)
                .token(token)
                .familyProductId(FAMILY_PRODUCT_ID)
                .createdAt(now)
                .build();

        ProjectGroup projectGroup = ProjectGroup.builder()
                .id(PROJECT_GROUP_ID)
                .build();

        FamilyProduct product = FamilyProduct.builder()
                .id(FAMILY_PRODUCT_ID)
                .name("Drop Test")
                .roleAccess(Set.of(
                        FamilyProductRoleAccess.builder()
                                .projectId(PROJECT_ID)
                                .role(UserProjectGroupRole.PARENT)
                                .build()
                ))
                .build();

        when(parentInvitationRepository.findByToken(token)).thenReturn(Optional.of(invitation));
        when(familyProductRepository.findById(FAMILY_PRODUCT_ID)).thenReturn(Optional.of(product));
        when(projectGroupRepository.findByProjectIdAndNameIsNull(PROJECT_ID))
                .thenReturn(Optional.of(projectGroup));

        parentInvitationService.acceptInvitation(token, currentUser);

        verify(userService).assignGroupRole(USER_ID, PROJECT_GROUP_ID, UserProjectGroupRole.PARENT);
        assertThat(invitation.getUsedByUserId()).isEqualTo(USER_ID);
        assertThat(invitation.getUsedAt()).isNotNull();
        verify(parentInvitationRepository).save(invitation);
    }

    @Test
    void acceptInvitation_WithUsedToken_ShouldThrow() {
        ParentInvitation invitation = ParentInvitation.builder()
                .token("used_token")
                .usedByUserId("someone")
                .usedAt(LocalDateTime.now())
                .build();

        when(parentInvitationRepository.findByToken("used_token")).thenReturn(Optional.of(invitation));

        assertThatThrownBy(() -> parentInvitationService.acceptInvitation(
                "used_token", User.builder().id(USER_ID).build()))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("This invitation has already been used");

        verify(userService, never()).assignGroupRole(any(), any(), any());
    }

    @Test
    void acceptInvitation_WithExpiredToken_ShouldThrow() {
        ParentInvitation invitation = ParentInvitation.builder()
                .token("expired_token")
                .expiresAt(LocalDateTime.now().minusDays(1))
                .build();

        when(parentInvitationRepository.findByToken("expired_token")).thenReturn(Optional.of(invitation));

        assertThatThrownBy(() -> parentInvitationService.acceptInvitation(
                "expired_token", User.builder().id(USER_ID).build()))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("This invitation has expired");

        verify(userService, never()).assignGroupRole(any(), any(), any());
    }

    @Test
    void acceptInvitation_WithInvalidToken_ShouldThrow() {
        when(parentInvitationRepository.findByToken("bad_token")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> parentInvitationService.acceptInvitation(
                "bad_token", User.builder().id(USER_ID).build()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Parent invitation not found");
    }

    @Test
    void acceptInvitation_WithNoRoleAccess_ShouldThrow() {
        String token = "no_role_token";
        ParentInvitation invitation = ParentInvitation.builder()
                .token(token)
                .familyProductId(FAMILY_PRODUCT_ID)
                .build();

        FamilyProduct product = FamilyProduct.builder()
                .id(FAMILY_PRODUCT_ID)
                .name("Drop Test")
                .roleAccess(null)
                .build();

        when(parentInvitationRepository.findByToken(token)).thenReturn(Optional.of(invitation));
        when(familyProductRepository.findById(FAMILY_PRODUCT_ID)).thenReturn(Optional.of(product));

        assertThatThrownBy(() -> parentInvitationService.acceptInvitation(
                token, User.builder().id(USER_ID).build()))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("This family product has no role access configured");

        verify(userService, never()).assignGroupRole(any(), any(), any());
    }

    @Test
    void acceptInvitation_WithNoParentAccess_ShouldThrow() {
        String token = "no_parent_token";
        ParentInvitation invitation = ParentInvitation.builder()
                .token(token)
                .familyProductId(FAMILY_PRODUCT_ID)
                .build();

        FamilyProduct product = FamilyProduct.builder()
                .id(FAMILY_PRODUCT_ID)
                .name("Drop Test")
                .roleAccess(Set.of(
                        FamilyProductRoleAccess.builder()
                                .projectId(PROJECT_ID)
                                .role(UserProjectGroupRole.MONITOR)
                                .build()
                ))
                .build();

        when(parentInvitationRepository.findByToken(token)).thenReturn(Optional.of(invitation));
        when(familyProductRepository.findById(FAMILY_PRODUCT_ID)).thenReturn(Optional.of(product));

        assertThatThrownBy(() -> parentInvitationService.acceptInvitation(
                token, User.builder().id(USER_ID).build()))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("This family product does not allow parent access");

        verify(userService, never()).assignGroupRole(any(), any(), any());
    }

    // ── revokeAllParentRolesByProject ───────────────────────────────

    @Test
    void revokeAllParentRolesByProject_ShouldDeleteAllParentRoles() {
        ProjectGroup projectGroup = ProjectGroup.builder()
                .id(PROJECT_GROUP_ID)
                .build();

        UserProjectGroup upg1 = UserProjectGroup.builder()
                .build();
        UserProjectGroup upg2 = UserProjectGroup.builder()
                .build();
        List<UserProjectGroup> parents = List.of(upg1, upg2);

        when(projectGroupRepository.findByProjectIdAndNameIsNull(PROJECT_ID))
                .thenReturn(Optional.of(projectGroup));
        when(userProjectGroupRepository.findByProjectGroupIdAndRole(
                PROJECT_GROUP_ID, UserProjectGroupRole.PARENT))
                .thenReturn(parents);

        int count = parentInvitationService.revokeAllParentRolesByProject(PROJECT_ID);

        assertThat(count).isEqualTo(2);
        verify(userProjectGroupRepository).deleteAll(parents);
    }

    @Test
    void revokeAllParentRolesByProject_WithNoParents_ShouldReturnZero() {
        ProjectGroup projectGroup = ProjectGroup.builder()
                .id(PROJECT_GROUP_ID)
                .build();

        when(projectGroupRepository.findByProjectIdAndNameIsNull(PROJECT_ID))
                .thenReturn(Optional.of(projectGroup));
        when(userProjectGroupRepository.findByProjectGroupIdAndRole(
                PROJECT_GROUP_ID, UserProjectGroupRole.PARENT))
                .thenReturn(List.of());

        int count = parentInvitationService.revokeAllParentRolesByProject(PROJECT_ID);

        assertThat(count).isZero();
        verify(userProjectGroupRepository, never()).deleteAll(any());
    }

    @Test
    void revokeAllParentRolesByProject_WithInvalidProject_ShouldThrow() {
        when(projectGroupRepository.findByProjectIdAndNameIsNull("INVALID"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> parentInvitationService.revokeAllParentRolesByProject("INVALID"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Project-level group not found for project: INVALID");
    }

    // ── buildInvitationLink ──────────────────────────────────────────

    @Test
    void buildInvitationLink_ShouldReturnCorrectUrl() {
        String link = parentInvitationService.buildInvitationLink("token123", "https://yambo.cabrasky.net");
        assertThat(link).isEqualTo("https://yambo.cabrasky.net/parent-invitation/token123");
    }

    // ── getFamilyProductName ─────────────────────────────────────────

    @Test
    void getFamilyProductName_ShouldReturnName() {
        FamilyProduct product = FamilyProduct.builder().id(FAMILY_PRODUCT_ID).name("Campamento 2025").build();
        when(familyProductRepository.findById(FAMILY_PRODUCT_ID)).thenReturn(Optional.of(product));

        String name = parentInvitationService.getFamilyProductName(FAMILY_PRODUCT_ID);
        assertThat(name).isEqualTo("Campamento 2025");
    }

    @Test
    void getFamilyProductName_WithUnknownId_ShouldReturnUnknown() {
        when(familyProductRepository.findById("UNKNOWN")).thenReturn(Optional.empty());

        String name = parentInvitationService.getFamilyProductName("UNKNOWN");
        assertThat(name).isEqualTo("Unknown");
    }
}
