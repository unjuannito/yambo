package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.*;
import es.yambo_alco.web.model.enums.UserProjectGroupRole;
import es.yambo_alco.web.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProjectRoleInvitationServiceTest {

    @Mock
    private ProjectRoleInvitationRepository projectRoleInvitationRepository;

    @Mock
    private ProjectRoleInvitationUsageRepository projectRoleInvitationUsageRepository;

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

    @Mock
    private ProfileRepository profileRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AccessGrantService accessGrantService;

    private ProjectRoleInvitationService projectRoleInvitationService;

    private static final String PROJECT_ID = "P0000001";
    private static final String USER_ID = "U0000001";
    private static final String PROJECT_GROUP_ID = "PG000001";

    @BeforeEach
    void setUp() {
        projectRoleInvitationService = new ProjectRoleInvitationService(
                projectRoleInvitationRepository, projectRoleInvitationUsageRepository,
                projectGroupRepository, userProjectGroupRepository, userRepository,
                projectRepository, profileRepository, userService, accessGrantService, passwordEncoder);
    }

    // ── createInvitation ──────────────────────────────────────────────

    @Test
    void createInvitation_ShouldCreateAndReturnInvitation() {
        Project project = Project.builder().id(PROJECT_ID).name("Barrio 2026").build();
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
        when(projectRoleInvitationRepository.save(any(ProjectRoleInvitation.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ProjectRoleInvitation result = projectRoleInvitationService.createInvitation(
                PROJECT_ID, UserProjectGroupRole.PARENT, USER_ID, null, null, null);

        assertThat(result).isNotNull();
        assertThat(result.getToken()).hasSize(20);
        assertThat(result.getToken()).matches("[A-Za-z0-9]{20}");
        assertThat(result.getProjectId()).isEqualTo(PROJECT_ID);
        assertThat(result.getRole()).isEqualTo(UserProjectGroupRole.PARENT);
        assertThat(result.getCreatedBy()).isEqualTo(USER_ID);
        assertThat(result.getEmail()).isNull();
        assertThat(result.isUsed()).isFalse();
        assertThat(result.getExpiresAt()).isNull();
        assertThat(result.getMaxUses()).isNull();
        assertThat(result.getUsageCount()).isZero();
        assertThat(result.isEnabled()).isTrue();

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
                PROJECT_ID, UserProjectGroupRole.COORDINATOR, USER_ID, email, null, null);

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
                PROJECT_ID, UserProjectGroupRole.MONITOR, USER_ID, null, expiresAt, null);

        assertThat(result.getExpiresAt()).isEqualTo(expiresAt);
    }

    @Test
    void createInvitation_WithMaxUses_ShouldSetLimit() {
        when(projectRepository.findById(PROJECT_ID))
                .thenReturn(Optional.of(Project.builder().id(PROJECT_ID).build()));
        when(projectRoleInvitationRepository.save(any(ProjectRoleInvitation.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ProjectRoleInvitation result = projectRoleInvitationService.createInvitation(
                PROJECT_ID, UserProjectGroupRole.MONITOR, USER_ID, null, null, 5);

        assertThat(result.getMaxUses()).isEqualTo(5);
    }

    @Test
    void createInvitation_WithInvalidMaxUses_ShouldThrow() {
        when(projectRepository.findById(PROJECT_ID))
                .thenReturn(Optional.of(Project.builder().id(PROJECT_ID).build()));

        assertThatThrownBy(() -> projectRoleInvitationService.createInvitation(
                PROJECT_ID, UserProjectGroupRole.PARENT, USER_ID, null, null, 0))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Max uses must be at least 1");

        verify(projectRoleInvitationRepository, never()).save(any());
    }

    @Test
    void createInvitation_WithInvalidProject_ShouldThrow() {
        when(projectRepository.findById("INVALID")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectRoleInvitationService.createInvitation(
                "INVALID", UserProjectGroupRole.PARENT, USER_ID, null, null, null))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Project not found");

        verify(projectRoleInvitationRepository, never()).save(any());
    }

    @Test
    void createInvitation_ShouldGenerateUniqueToken() {
        when(projectRepository.findById(PROJECT_ID))
                .thenReturn(Optional.of(Project.builder().id(PROJECT_ID).build()));
        when(projectRoleInvitationRepository.findByToken(anyString()))
                .thenReturn(Optional.empty());
        when(projectRoleInvitationRepository.save(any(ProjectRoleInvitation.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ProjectRoleInvitation result = projectRoleInvitationService.createInvitation(
                PROJECT_ID, UserProjectGroupRole.PARENT, USER_ID, null, null, null);

        assertThat(result.getToken()).hasSize(20);
        verify(projectRoleInvitationRepository, atLeastOnce()).findByToken(anyString());
    }

    // ── acceptInvitation ──────────────────────────────────────────────

    @Test
    void acceptInvitation_ShouldAssignRoleAndMarkUsed() {
        String token = "abc123ABC456def789GHI";
        User currentUser = User.builder().id(USER_ID).name("Test Parent").email("parent@test.com").build();

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
        assertThat(invitation.getUsageCount()).isEqualTo(1);
        verify(projectRoleInvitationRepository).save(invitation);
        verify(projectRoleInvitationUsageRepository).save(any(ProjectRoleInvitationUsage.class));
    }

    @Test
    void acceptInvitation_ShouldRecordUsageWithUserData() {
        String token = "tokenForUsageTest123";
        User currentUser = User.builder().id(USER_ID).name("Parent Name").email("parent@test.com").build();

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

        verify(projectRoleInvitationUsageRepository).save(argThat(usage ->
                usage.getInvitationId().equals(1L)
                        && usage.getUserId().equals(USER_ID)
                        && usage.getUserEmail().equals("parent@test.com")
                        && usage.getUserName().equals("Parent Name")
                        && !usage.isWasNewRegistration()
                        && usage.getUsedAt() != null));
    }

    @Test
    void acceptInvitation_ForCoordinatorRole_ShouldAssignCoordinator() {
        String token = "coordinatorToken123";
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
        String token = "createGroupToken123";
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
                .maxUses(1)
                .usageCount(1)
                .build();

        when(projectRoleInvitationRepository.findByToken("used_token")).thenReturn(Optional.of(invitation));

        assertThatThrownBy(() -> projectRoleInvitationService.acceptInvitation(
                "used_token", User.builder().id(USER_ID).build()))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("This invitation has reached its maximum number of uses");

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
    void acceptInvitation_WithDisabledToken_ShouldThrow() {
        ProjectRoleInvitation invitation = ProjectRoleInvitation.builder()
                .token("disabled_token")
                .enabled(false)
                .build();

        when(projectRoleInvitationRepository.findByToken("disabled_token")).thenReturn(Optional.of(invitation));

        assertThatThrownBy(() -> projectRoleInvitationService.acceptInvitation(
                "disabled_token", User.builder().id(USER_ID).build()))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("This invitation is disabled");

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

    // ── registerAndAccept ────────────────────────────────────────────

    @Test
    void registerAndAccept_ShouldCreateUserAssignRoleAndRecordUsage() {
        String token = "registerToken123";
        String email = "New@Parent.COM";

        ProjectRoleInvitation invitation = ProjectRoleInvitation.builder()
                .id(1L)
                .token(token)
                .projectId(PROJECT_ID)
                .role(UserProjectGroupRole.PARENT)
                .createdAt(LocalDateTime.now())
                .build();

        ProjectGroup projectGroup = ProjectGroup.builder().id(PROJECT_GROUP_ID).build();
        Profile userProfile = Profile.builder().id("USER").name("Standard User").build();
        User savedUser = User.builder().id("U0000099").email("new@parent.com").build();

        when(projectRoleInvitationRepository.findByToken(token)).thenReturn(Optional.of(invitation));
        when(userRepository.existsByEmail("new@parent.com")).thenReturn(false);
        when(profileRepository.findAllById(anyList())).thenReturn(List.of(userProfile));
        when(passwordEncoder.encode("password123")).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(projectGroupRepository.findByProjectIdAndNameIsNull(PROJECT_ID))
                .thenReturn(Optional.of(projectGroup));

        User result = projectRoleInvitationService.registerAndAccept(
                token, email, "password123", "New Parent");

        assertThat(result).isSameAs(savedUser);
        verify(userRepository).save(argThat(user ->
                user.getEmail().equals("new@parent.com")
                        && user.getPassword().equals("encoded")
                        && user.getName().equals("New Parent")
                        && user.isEnabled()
                        && user.getProfiles().contains(userProfile)));
        verify(userService).assignGroupRole("U0000099", PROJECT_GROUP_ID, UserProjectGroupRole.PARENT);
        assertThat(invitation.getUsedByUserId()).isEqualTo("U0000099");
        assertThat(invitation.getUsageCount()).isEqualTo(1);
        verify(projectRoleInvitationUsageRepository).save(argThat(usage ->
                usage.isWasNewRegistration()
                        && usage.getInvitationId().equals(1L)
                        && usage.getUserId().equals("U0000099")));
    }

    @Test
    void registerAndAccept_WithExistingEmail_ShouldThrow() {
        String token = "existingEmailToken";
        when(projectRoleInvitationRepository.findByToken(token))
                .thenReturn(Optional.of(ProjectRoleInvitation.builder()
                        .token(token).projectId(PROJECT_ID)
                        .role(UserProjectGroupRole.PARENT).build()));
        when(userRepository.existsByEmail("existing@test.com")).thenReturn(true);

        assertThatThrownBy(() -> projectRoleInvitationService.registerAndAccept(
                token, "existing@test.com", "password123", "Existing"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Email already registered");

        verify(userRepository, never()).save(any());
    }

    // ── updateInvitation ─────────────────────────────────────────────

    @Test
    void updateInvitation_ShouldUpdateLimits() {
        ProjectRoleInvitation invitation = ProjectRoleInvitation.builder()
                .id(1L).token("updateToken123").projectId(PROJECT_ID)
                .role(UserProjectGroupRole.MONITOR).build();

        when(projectRoleInvitationRepository.findById(1L)).thenReturn(Optional.of(invitation));
        when(projectRoleInvitationRepository.save(any(ProjectRoleInvitation.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        LocalDateTime expiresAt = LocalDateTime.now().plusDays(30);
        ProjectRoleInvitation result = projectRoleInvitationService.updateInvitation(
                1L, 10, expiresAt, false);

        assertThat(result.getMaxUses()).isEqualTo(10);
        assertThat(result.getExpiresAt()).isEqualTo(expiresAt);
        assertThat(result.isEnabled()).isFalse();
    }

    @Test
    void updateInvitation_ShouldOnlyUpdateProvidedFields() {
        ProjectRoleInvitation invitation = ProjectRoleInvitation.builder()
                .id(1L).token("partialToken").projectId(PROJECT_ID)
                .role(UserProjectGroupRole.MONITOR).build();

        when(projectRoleInvitationRepository.findById(1L)).thenReturn(Optional.of(invitation));
        when(projectRoleInvitationRepository.save(any(ProjectRoleInvitation.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ProjectRoleInvitation result = projectRoleInvitationService.updateInvitation(1L, null, null, true);

        assertThat(result.getMaxUses()).isNull();
        assertThat(result.getExpiresAt()).isNull();
        assertThat(result.isEnabled()).isTrue();
    }

    @Test
    void updateInvitation_WithInvalidMaxUses_ShouldThrow() {
        ProjectRoleInvitation invitation = ProjectRoleInvitation.builder()
                .id(1L).token("invalidMaxToken").projectId(PROJECT_ID)
                .role(UserProjectGroupRole.MONITOR).build();

        when(projectRoleInvitationRepository.findById(1L)).thenReturn(Optional.of(invitation));

        assertThatThrownBy(() -> projectRoleInvitationService.updateInvitation(1L, 0, null, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Max uses must be at least 1");
    }

    // ── getUsages ────────────────────────────────────────────────────

    @Test
    void getUsages_ShouldReturnUsagesOrderedByUsedAtDesc() {
        ProjectRoleInvitationUsage u1 = ProjectRoleInvitationUsage.builder()
                .id(1L).invitationId(1L).userId(USER_ID).wasNewRegistration(true)
                .usedAt(LocalDateTime.now().minusDays(1)).build();
        ProjectRoleInvitationUsage u2 = ProjectRoleInvitationUsage.builder()
                .id(2L).invitationId(1L).userId(USER_ID).wasNewRegistration(false)
                .usedAt(LocalDateTime.now()).build();

        when(projectRoleInvitationUsageRepository.findByInvitationIdOrderByUsedAtDesc(1L))
                .thenReturn(List.of(u2, u1));

        List<ProjectRoleInvitationUsage> usages = projectRoleInvitationService.getUsages(1L);

        assertThat(usages).hasSize(2);
        assertThat(usages.get(0).getId()).isEqualTo(2L);
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
