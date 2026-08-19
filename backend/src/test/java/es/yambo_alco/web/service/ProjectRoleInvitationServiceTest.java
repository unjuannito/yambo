package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.*;
import es.yambo_alco.web.model.enums.UserProjectGroupRole;
import es.yambo_alco.web.repository.ProjectGroupRepository;
import es.yambo_alco.web.repository.ProjectRepository;
import es.yambo_alco.web.repository.ProjectRoleInvitationRepository;
import es.yambo_alco.web.repository.UserProjectGroupRepository;
import es.yambo_alco.web.repository.UserRepository;
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
class ProjectRoleInvitationServiceTest {

    @Mock
    private ProjectRoleInvitationRepository projectRoleInvitationRepository;

    @Mock
    private ProjectGroupRepository projectGroupRepository;

    @Mock
    private UserProjectGroupRepository userProjectGroupRepository;

    @Mock
    private UserService userService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProjectRepository projectRepository;

    private ProjectRoleInvitationService projectRoleInvitationService;

    private static final String PROJECT_ID = "P0000001";
    private static final String USER_ID = "U0000001";
    private static final String PROJECT_GROUP_ID = "PG000001";

    @BeforeEach
    void setUp() {
        projectRoleInvitationService = new ProjectRoleInvitationService(
                projectRoleInvitationRepository, projectGroupRepository,
                userProjectGroupRepository, userRepository, projectRepository, userService);
    }

    // ── createInvitation ──────────────────────────────────────────────

    @Test
    void createInvitation_ShouldCreateAndReturnInvitation() {
        Project project = Project.builder().id(PROJECT_ID).name("Barrio 2026").build();
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
        when(projectRoleInvitationRepository.save(any(ProjectRoleInvitation.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ProjectRoleInvitation result = projectRoleInvitationService.createInvitation(
                PROJECT_ID, UserProjectGroupRole.PARENT, USER_ID, null, null);

        assertThat(result).isNotNull();
        assertThat(result.getToken()).startsWith("prj_role_");
        assertThat(result.getProjectId()).isEqualTo(PROJECT_ID);
        assertThat(result.getRole()).isEqualTo(UserProjectGroupRole.PARENT);
        assertThat(result.getCreatedBy()).isEqualTo(USER_ID);
        assertThat(result.getEmail()).isNull();
        assertThat(result.isUsed()).isFalse();
        assertThat(result.getExpiresAt()).isNull();

        verify(projectRepository).findById(PROJECT_ID);
        verify(projectRoleInvitationRepository).save(any(ProjectRoleInvitation.class));
    }

    @Test
    void createInvitation_WithEmail_ShouldNormalizeAndStore() {
        String email = "Test@Example.COM";
        when(projectRepository.findById(PROJECT_ID))
                .thenReturn(Optional.of(Project.builder().id(PROJECT_ID).build()));
        when(projectRoleInvitationRepository.save(any(ProjectRoleInvitation.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ProjectRoleInvitation result = projectRoleInvitationService.createInvitation(
                PROJECT_ID, UserProjectGroupRole.COORDINATOR, USER_ID, email, null);

        assertThat(result.getEmail()).isEqualTo("test@example.com");
    }

    @Test
    void createInvitation_WithExpiresAt_ShouldSetExpiration() {
        LocalDateTime expiresAt = LocalDateTime.now().plusDays(7);
        when(projectRepository.findById(PROJECT_ID))
                .thenReturn(Optional.of(Project.builder().id(PROJECT_ID).build()));
        when(projectRoleInvitationRepository.save(any(ProjectRoleInvitation.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ProjectRoleInvitation result = projectRoleInvitationService.createInvitation(
                PROJECT_ID, UserProjectGroupRole.MONITOR, USER_ID, null, expiresAt);

        assertThat(result.getExpiresAt()).isEqualTo(expiresAt);
    }

    @Test
    void createInvitation_WithInvalidProject_ShouldThrow() {
        when(projectRepository.findById("INVALID")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectRoleInvitationService.createInvitation(
                "INVALID", UserProjectGroupRole.PARENT, USER_ID, null, null))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Project not found");

        verify(projectRoleInvitationRepository, never()).save(any());
    }

    // ── acceptInvitation ──────────────────────────────────────────────

    @Test
    void acceptInvitation_ShouldAssignRoleAndMarkUsed() {
        String token = "prj_role_token123";
        User currentUser = User.builder().id(USER_ID).name("Test Parent").build();

        ProjectRoleInvitation invitation = ProjectRoleInvitation.builder()
                .id(1L)
                .token(token)
                .projectId(PROJECT_ID)
                .role(UserProjectGroupRole.PARENT)
                .createdAt(LocalDateTime.now())
                .build();

        ProjectGroup projectGroup = ProjectGroup.builder().id(PROJECT_GROUP_ID).build();

        when(projectRoleInvitationRepository.findByToken(token)).thenReturn(Optional.of(invitation));
        when(projectGroupRepository.findByProjectIdAndNameIsNull(PROJECT_ID))
                .thenReturn(Optional.of(projectGroup));

        projectRoleInvitationService.acceptInvitation(token, currentUser);

        verify(userService).assignGroupRole(USER_ID, PROJECT_GROUP_ID, UserProjectGroupRole.PARENT);
        assertThat(invitation.getUsedByUserId()).isEqualTo(USER_ID);
        assertThat(invitation.getUsedAt()).isNotNull();
        verify(projectRoleInvitationRepository).save(invitation);
    }

    @Test
    void acceptInvitation_ForCoordinatorRole_ShouldAssignCoordinator() {
        String token = "prj_role_token456";
        User currentUser = User.builder().id(USER_ID).build();

        ProjectRoleInvitation invitation = ProjectRoleInvitation.builder()
                .token(token)
                .projectId(PROJECT_ID)
                .role(UserProjectGroupRole.COORDINATOR)
                .build();

        ProjectGroup projectGroup = ProjectGroup.builder().id(PROJECT_GROUP_ID).build();

        when(projectRoleInvitationRepository.findByToken(token)).thenReturn(Optional.of(invitation));
        when(projectGroupRepository.findByProjectIdAndNameIsNull(PROJECT_ID))
                .thenReturn(Optional.of(projectGroup));

        projectRoleInvitationService.acceptInvitation(token, currentUser);

        verify(userService).assignGroupRole(USER_ID, PROJECT_GROUP_ID, UserProjectGroupRole.COORDINATOR);
    }

    @Test
    void acceptInvitation_WhenProjectLevelGroupMissing_ShouldCreateIt() {
        String token = "prj_role_token789";
        User currentUser = User.builder().id(USER_ID).build();

        ProjectRoleInvitation invitation = ProjectRoleInvitation.builder()
                .token(token)
                .projectId(PROJECT_ID)
                .role(UserProjectGroupRole.MONITOR)
                .build();

        Project project = Project.builder().id(PROJECT_ID).build();
        ProjectGroup createdGroup = ProjectGroup.builder().id(PROJECT_GROUP_ID).build();

        when(projectRoleInvitationRepository.findByToken(token)).thenReturn(Optional.of(invitation));
        when(projectGroupRepository.findByProjectIdAndNameIsNull(PROJECT_ID))
                .thenReturn(Optional.empty());
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
        when(projectGroupRepository.save(any(ProjectGroup.class))).thenReturn(createdGroup);

        projectRoleInvitationService.acceptInvitation(token, currentUser);

        verify(projectGroupRepository).save(any(ProjectGroup.class));
        verify(userService).assignGroupRole(USER_ID, PROJECT_GROUP_ID, UserProjectGroupRole.MONITOR);
    }

    @Test
    void acceptInvitation_WithUsedToken_ShouldThrow() {
        ProjectRoleInvitation invitation = ProjectRoleInvitation.builder()
                .token("used_token")
                .usedByUserId("someone")
                .usedAt(LocalDateTime.now())
                .build();

        when(projectRoleInvitationRepository.findByToken("used_token")).thenReturn(Optional.of(invitation));

        assertThatThrownBy(() -> projectRoleInvitationService.acceptInvitation(
                "used_token", User.builder().id(USER_ID).build()))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("This invitation has already been used");

        verify(userService, never()).assignGroupRole(any(), any(), any());
    }

    @Test
    void acceptInvitation_WithExpiredToken_ShouldThrow() {
        ProjectRoleInvitation invitation = ProjectRoleInvitation.builder()
                .token("expired_token")
                .expiresAt(LocalDateTime.now().minusDays(1))
                .build();

        when(projectRoleInvitationRepository.findByToken("expired_token")).thenReturn(Optional.of(invitation));

        assertThatThrownBy(() -> projectRoleInvitationService.acceptInvitation(
                "expired_token", User.builder().id(USER_ID).build()))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("This invitation has expired");

        verify(userService, never()).assignGroupRole(any(), any(), any());
    }

    @Test
    void acceptInvitation_WithInvalidToken_ShouldThrow() {
        when(projectRoleInvitationRepository.findByToken("bad_token")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectRoleInvitationService.acceptInvitation(
                "bad_token", User.builder().id(USER_ID).build()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Project role invitation not found");
    }

    // ── revokeAllParentRolesByProject ───────────────────────────────

    @Test
    void revokeAllParentRolesByProject_ShouldDeleteAllParentRoles() {
        ProjectGroup projectGroup = ProjectGroup.builder().id(PROJECT_GROUP_ID).build();

        UserProjectGroup upg1 = UserProjectGroup.builder().build();
        UserProjectGroup upg2 = UserProjectGroup.builder().build();
        List<UserProjectGroup> parents = List.of(upg1, upg2);

        when(projectGroupRepository.findByProjectIdAndNameIsNull(PROJECT_ID))
                .thenReturn(Optional.of(projectGroup));
        when(userProjectGroupRepository.findByProjectGroupIdAndRole(
                PROJECT_GROUP_ID, UserProjectGroupRole.PARENT))
                .thenReturn(parents);

        int count = projectRoleInvitationService.revokeAllParentRolesByProject(PROJECT_ID);

        assertThat(count).isEqualTo(2);
        verify(userProjectGroupRepository).deleteAll(parents);
    }

    @Test
    void revokeAllParentRolesByProject_WithNoParents_ShouldReturnZero() {
        ProjectGroup projectGroup = ProjectGroup.builder().id(PROJECT_GROUP_ID).build();

        when(projectGroupRepository.findByProjectIdAndNameIsNull(PROJECT_ID))
                .thenReturn(Optional.of(projectGroup));
        when(userProjectGroupRepository.findByProjectGroupIdAndRole(
                PROJECT_GROUP_ID, UserProjectGroupRole.PARENT))
                .thenReturn(List.of());

        int count = projectRoleInvitationService.revokeAllParentRolesByProject(PROJECT_ID);

        assertThat(count).isZero();
        verify(userProjectGroupRepository, never()).deleteAll(any());
    }

    @Test
    void revokeAllParentRolesByProject_WithInvalidProject_ShouldThrow() {
        when(projectGroupRepository.findByProjectIdAndNameIsNull("INVALID"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectRoleInvitationService.revokeAllParentRolesByProject("INVALID"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Project-level group not found for project: INVALID");
    }

    // ── buildInvitationLink ──────────────────────────────────────────

    @Test
    void buildInvitationLink_ShouldReturnCorrectUrl() {
        String link = projectRoleInvitationService.buildInvitationLink("token123", "https://yambo.cabrasky.net");
        assertThat(link).isEqualTo("https://yambo.cabrasky.net/project-role-invitation/token123");
    }

    // ── getProjectName ─────────────────────────────────────────

    @Test
    void getProjectName_ShouldReturnName() {
        Project project = Project.builder().id(PROJECT_ID).name("Barrio 2026").build();
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));

        String name = projectRoleInvitationService.getProjectName(PROJECT_ID);
        assertThat(name).isEqualTo("Barrio 2026");
    }

    @Test
    void getProjectName_WithUnknownId_ShouldReturnUnknown() {
        when(projectRepository.findById("UNKNOWN")).thenReturn(Optional.empty());

        String name = projectRoleInvitationService.getProjectName("UNKNOWN");
        assertThat(name).isEqualTo("Unknown");
    }
}
