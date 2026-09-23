package es.yambo_alco.web.service;

import es.yambo_alco.web.model.AccessGrant;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.model.Project;
import es.yambo_alco.web.model.ProjectGroup;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.GrantType;
import es.yambo_alco.web.model.enums.InvitationType;
import es.yambo_alco.web.model.enums.UserProjectGroupRole;
import es.yambo_alco.web.repository.AccessGrantRepository;
import es.yambo_alco.web.repository.ProfileRepository;
import es.yambo_alco.web.repository.ProjectGroupRepository;
import es.yambo_alco.web.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccessGrantServiceTest {

    @Mock
    private AccessGrantRepository accessGrantRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProfileRepository profileRepository;

    @Mock
    private ProjectGroupRepository projectGroupRepository;

    private AccessGrantService accessGrantService;

    @BeforeEach
    void setUp() {
        accessGrantService = new AccessGrantService(
                accessGrantRepository, userRepository, profileRepository, projectGroupRepository);
    }

    @Test
    void recordManualProfileGrant_ShouldSaveGrantWithManualSource() {
        when(accessGrantRepository.save(any(AccessGrant.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        accessGrantService.recordManualProfileGrant("U0000001", "P0000001", "U0000002");

        verify(accessGrantRepository).save(any(AccessGrant.class));
    }

    @Test
    void recordInvitationProfileGrants_ShouldDedupeExistingActiveGrant() {
        when(accessGrantRepository
                .findFirstByUserIdAndGrantTypeAndProfileIdAndSourceAndInvitationTypeAndInvitationIdAndRevokedAtIsNull(
                        "U0000001", GrantType.PROFILE, "P0000001", es.yambo_alco.web.model.enums.GrantSource.INVITATION,
                        InvitationType.LINK, 42L))
                .thenReturn(Optional.of(AccessGrant.builder().id(1L).build()));

        Profile profile = Profile.builder().id("P0000001").build();
        accessGrantService.recordInvitationProfileGrants(
                "U0000001", 42L, InvitationType.LINK, Set.of(profile), "U0000002");

        verify(accessGrantRepository, never()).save(any(AccessGrant.class));
    }

    @Test
    void recordInvitationProfileGrants_ShouldSaveWhenNoExistingGrant() {
        when(accessGrantRepository
                .findFirstByUserIdAndGrantTypeAndProfileIdAndSourceAndInvitationTypeAndInvitationIdAndRevokedAtIsNull(
                        any(), any(), any(), any(), any(), any()))
                .thenReturn(Optional.empty());
        when(accessGrantRepository.save(any(AccessGrant.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        Profile profile = Profile.builder().id("P0000001").build();
        accessGrantService.recordInvitationProfileGrants(
                "U0000001", 42L, InvitationType.LINK, Set.of(profile), "U0000002");

        verify(accessGrantRepository).save(any(AccessGrant.class));
    }

    @Test
    void getUserHistory_ShouldEnrichWithNames() {
        AccessGrant grant = AccessGrant.builder()
                .id(1L)
                .userId("U0000001")
                .grantType(GrantType.PROFILE)
                .profileId("P0000001")
                .source(es.yambo_alco.web.model.enums.GrantSource.MANUAL)
                .grantedBy("U0000002")
                .grantedAt(LocalDateTime.now())
                .build();
        when(accessGrantRepository.findByUserIdOrderByGrantedAtDesc("U0000001"))
                .thenReturn(List.of(grant));
        when(profileRepository.findById("P0000001"))
                .thenReturn(Optional.of(Profile.builder().id("P0000001").name("Monitor").build()));
        when(userRepository.findById("U0000002"))
                .thenReturn(Optional.of(User.builder().id("U0000002").name("Admin").build()));

        List<AccessGrantService.AccessGrantDto> history = accessGrantService.getUserHistory("U0000001");

        assertThat(history).hasSize(1);
        assertThat(history.get(0).getProfileName()).isEqualTo("Monitor");
        assertThat(history.get(0).getGrantedByName()).isEqualTo("Admin");
        assertThat(history.get(0).getSource()).isEqualTo("MANUAL");
    }

    @Test
    void getUserHistory_GroupRole_ShouldEnrichProjectAndGroup() {
        AccessGrant grant = AccessGrant.builder()
                .id(2L)
                .userId("U0000001")
                .grantType(GrantType.GROUP_ROLE)
                .projectGroupId("PG000001")
                .role(UserProjectGroupRole.COORDINATOR)
                .source(es.yambo_alco.web.model.enums.GrantSource.INVITATION)
                .invitationType(InvitationType.PROJECT_ROLE)
                .invitationId(7L)
                .grantedAt(LocalDateTime.now())
                .build();
        when(accessGrantRepository.findByUserIdOrderByGrantedAtDesc("U0000001"))
                .thenReturn(List.of(grant));
        Project project = Project.builder().id("P0000001").name("Barrio 2026").build();
        ProjectGroup group = ProjectGroup.builder().id("PG000001").name(null).project(project).build();
        when(projectGroupRepository.findById("PG000001")).thenReturn(Optional.of(group));

        List<AccessGrantService.AccessGrantDto> history = accessGrantService.getUserHistory("U0000001");

        assertThat(history).hasSize(1);
        assertThat(history.get(0).getProjectName()).isEqualTo("Barrio 2026");
        assertThat(history.get(0).getRole()).isEqualTo("COORDINATOR");
        assertThat(history.get(0).getInvitationType()).isEqualTo("PROJECT_ROLE");
        assertThat(history.get(0).getInvitationId()).isEqualTo(7L);
    }

    @Test
    void revokeProfileGrants_ShouldDelegateToRepository() {
        accessGrantService.revokeProfileGrants("U0000001", "P0000001");

        verify(accessGrantRepository).revokeActiveProfileGrants(
                eq("U0000001"), eq("P0000001"), any(LocalDateTime.class));
    }

    @Test
    void revokeGroupRoleGrants_ShouldDelegateToRepository() {
        accessGrantService.revokeGroupRoleGrants("U0000001", "PG000001", UserProjectGroupRole.MONITOR);

        verify(accessGrantRepository).revokeActiveGroupRoleGrants(
                eq("U0000001"), eq("PG000001"), eq(UserProjectGroupRole.MONITOR), any(LocalDateTime.class));
    }
}
