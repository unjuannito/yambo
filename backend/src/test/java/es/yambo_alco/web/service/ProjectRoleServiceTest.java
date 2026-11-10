package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.ProjectRole;
import es.yambo_alco.web.model.UserProjectGroup;
import es.yambo_alco.web.repository.AccessGrantRepository;
import es.yambo_alco.web.repository.ProjectRoleRepository;
import es.yambo_alco.web.repository.UserProjectGroupRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectRoleServiceTest {

    @Mock
    private ProjectRoleRepository projectRoleRepository;

    @Mock
    private UserProjectGroupRepository userProjectGroupRepository;

    @Mock
    private AccessGrantRepository accessGrantRepository;

    private ProjectRoleService projectRoleService;

    @BeforeEach
    void setUp() {
        projectRoleService = new ProjectRoleService(
                projectRoleRepository, userProjectGroupRepository, accessGrantRepository);
    }

    @Test
    void create_ShouldNormalizeKeyToUppercaseAndSave() {
        when(projectRoleRepository.existsById("VOLUNTARIO")).thenReturn(false);
        when(projectRoleRepository.existsByName("Voluntario")).thenReturn(false);
        when(projectRoleRepository.save(any(ProjectRole.class))).thenAnswer(inv -> inv.getArgument(0));

        ProjectRole result = projectRoleService.create("voluntario", "Voluntario", true);

        assertThat(result.getKey()).isEqualTo("VOLUNTARIO");
        assertThat(result.getName()).isEqualTo("Voluntario");
        assertThat(result.isTeam()).isTrue();
    }

    @Test
    void create_WithExistingKey_ShouldThrow() {
        when(projectRoleRepository.existsById("MONITOR")).thenReturn(true);

        assertThatThrownBy(() -> projectRoleService.create("MONITOR", "Otro", false))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("MONITOR");
        verify(projectRoleRepository, never()).save(any());
    }

    @Test
    void create_WithDuplicateName_ShouldThrow() {
        when(projectRoleRepository.existsById("VOLUNTARIO")).thenReturn(false);
        when(projectRoleRepository.existsByName("Monitor")).thenReturn(true);

        assertThatThrownBy(() -> projectRoleService.create("VOLUNTARIO", "Monitor", true))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Monitor");
        verify(projectRoleRepository, never()).save(any());
    }

    @Test
    void create_WithBlankName_ShouldThrow() {
        assertThatThrownBy(() -> projectRoleService.create("VOLUNTEER", "  ", true))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void create_WithBlankKey_ShouldThrow() {
        assertThatThrownBy(() -> projectRoleService.create("   ", "Voluntario", true))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void update_ShouldRefreshIsTeamOnMembershipsWhenFlagChanges() {
        ProjectRole existing = ProjectRole.builder().key("MONITOR").name("Monitor").isTeam(true).build();
        UserProjectGroup upg = UserProjectGroup.builder().role("MONITOR").isTeam(true).build();
        when(projectRoleRepository.findById("MONITOR")).thenReturn(Optional.of(existing));
        when(projectRoleRepository.existsByName("Monitor de Barrio")).thenReturn(true);
        when(projectRoleRepository.findByName("Monitor de Barrio")).thenReturn(Optional.of(existing));
        when(userProjectGroupRepository.findByRole("MONITOR")).thenReturn(List.of(upg));
        when(projectRoleRepository.save(any(ProjectRole.class))).thenAnswer(inv -> inv.getArgument(0));

        ProjectRole result = projectRoleService.update("MONITOR", "Monitor de Barrio", false);

        assertThat(result.isTeam()).isFalse();
        assertThat(upg.isTeam()).isFalse();
        assertThat(result.getName()).isEqualTo("Monitor de Barrio");
    }

    @Test
    void update_WithDuplicateName_ShouldThrow() {
        ProjectRole existing = ProjectRole.builder().key("MONITOR").name("Monitor").isTeam(true).build();
        ProjectRole other = ProjectRole.builder().key("COORDINATOR").name("Coordinador").isTeam(true).build();
        when(projectRoleRepository.findById("MONITOR")).thenReturn(Optional.of(existing));
        when(projectRoleRepository.existsByName("Coordinador")).thenReturn(true);
        when(projectRoleRepository.findByName("Coordinador")).thenReturn(Optional.of(other));

        assertThatThrownBy(() -> projectRoleService.update("MONITOR", "Coordinador", null))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void update_WithUnknownKey_ShouldThrow() {
        when(projectRoleRepository.findById("NOPE")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectRoleService.update("NOPE", "Cualquiera", null))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void delete_SeededRole_ShouldThrow() {
        when(projectRoleRepository.findById("PARENT"))
                .thenReturn(Optional.of(ProjectRole.builder().key("PARENT").name("Padre/Madre").isTeam(false).build()));

        assertThatThrownBy(() -> projectRoleService.delete("PARENT"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("por defecto");
        verify(projectRoleRepository, never()).delete(any());
    }

    @Test
    void delete_WithExistingMemberships_ShouldThrow() {
        when(projectRoleRepository.findById("VOLUNTEER"))
                .thenReturn(Optional.of(ProjectRole.builder().key("VOLUNTEER").name("Voluntario").isTeam(true).build()));
        when(userProjectGroupRepository.countByRole("VOLUNTEER")).thenReturn(2L);

        assertThatThrownBy(() -> projectRoleService.delete("VOLUNTEER"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("pertenencia");
        verify(projectRoleRepository, never()).delete(any());
    }

    @Test
    void delete_WithActiveGrants_ShouldThrow() {
        when(projectRoleRepository.findById("VOLUNTEER"))
                .thenReturn(Optional.of(ProjectRole.builder().key("VOLUNTEER").name("Voluntario").isTeam(true).build()));
        when(userProjectGroupRepository.countByRole("VOLUNTEER")).thenReturn(0L);
        when(accessGrantRepository.countByGrantTypeAndRoleAndRevokedAtIsNull(
                es.yambo_alco.web.model.enums.GrantType.GROUP_ROLE, "VOLUNTEER")).thenReturn(1L);

        assertThatThrownBy(() -> projectRoleService.delete("VOLUNTEER"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("acceso");
        verify(projectRoleRepository, never()).delete(any());
    }

    @Test
    void delete_WithNoUsage_ShouldDelete() {
        when(projectRoleRepository.findById("VOLUNTEER"))
                .thenReturn(Optional.of(ProjectRole.builder().key("VOLUNTEER").name("Voluntario").isTeam(true).build()));
        when(userProjectGroupRepository.countByRole("VOLUNTEER")).thenReturn(0L);
        when(accessGrantRepository.countByGrantTypeAndRoleAndRevokedAtIsNull(
                es.yambo_alco.web.model.enums.GrantType.GROUP_ROLE, "VOLUNTEER")).thenReturn(0L);

        projectRoleService.delete("VOLUNTEER");

        verify(projectRoleRepository).delete(any(ProjectRole.class));
    }

    @Test
    void listTeamRoles_ShouldDelegateToRepository() {
        when(projectRoleRepository.findByIsTeamTrueOrderByNameAsc())
                .thenReturn(List.of(ProjectRole.builder().key("MONITOR").name("Monitor").isTeam(true).build()));

        List<ProjectRole> result = projectRoleService.listTeamRoles();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getKey()).isEqualTo("MONITOR");
    }
}
