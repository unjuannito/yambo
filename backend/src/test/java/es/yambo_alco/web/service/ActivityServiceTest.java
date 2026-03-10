package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.Activity;
import es.yambo_alco.web.model.Project;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.ActivityStatus;
import es.yambo_alco.web.repository.ActivityRepository;
import es.yambo_alco.web.repository.ProjectRepository;
import es.yambo_alco.web.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

public class ActivityServiceTest {

    private ActivityRepository activityRepository;
    private ProjectRepository projectRepository;
    private UserRepository userRepository;
    private ActivityService activityService;

    private Project testProject;
    private User testManager;

    @BeforeEach
    public void setup() {
        activityRepository = Mockito.mock(ActivityRepository.class);
        projectRepository = Mockito.mock(ProjectRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        activityService = new ActivityService(activityRepository, projectRepository, userRepository);

        testProject = Project.builder()
                .id("PRJ00001")
                .name("Test Project")
                .build();

        testManager = User.builder()
                .id("U0000001")
                .name("Test Manager")
                .email("manager@example.com")
                .password("password")
                .profiles(Set.of())
                .build();
    }

    // ── createActivity ──────────────────────────────────────────────────

    @Test
    public void createActivity_WithValidData_ShouldSaveAndReturn() {
        // Given
        when(projectRepository.findById("PRJ00001")).thenReturn(Optional.of(testProject));
        when(activityRepository.save(any(Activity.class))).thenAnswer(inv -> {
            Activity a = inv.getArgument(0);
            a.setId("ACT00001");
            return a;
        });

        LocalDateTime date = LocalDateTime.of(2026, 3, 15, 10, 0);

        // When
        Activity result = activityService.createActivity(
                "Workshop", "A description", date,
                ActivityStatus.PLANNED, true,
                "PRJ00001", null);

        // Then
        assertThat(result.getName()).isEqualTo("Workshop");
        assertThat(result.getDescription()).isEqualTo("A description");
        assertThat(result.getDate()).isEqualTo(date);
        assertThat(result.getStatus()).isEqualTo(ActivityStatus.PLANNED);
        assertThat(result.isPublic()).isTrue();
        assertThat(result.getProject()).isEqualTo(testProject);
        assertThat(result.getManager()).isNull();
        verify(activityRepository).save(any(Activity.class));
    }

    @Test
    public void createActivity_WithManager_ShouldValidateAndAssign() {
        // Given
        when(projectRepository.findById("PRJ00001")).thenReturn(Optional.of(testProject));
        when(userRepository.findById("U0000001")).thenReturn(Optional.of(testManager));
        when(userRepository.findStaffByProjectId("PRJ00001")).thenReturn(List.of(testManager));
        when(activityRepository.save(any(Activity.class))).thenAnswer(inv -> inv.getArgument(0));

        // When
        Activity result = activityService.createActivity(
                "Workshop", null, null,
                ActivityStatus.OPEN_REGISTRATION, false,
                "PRJ00001", "U0000001");

        // Then
        assertThat(result.getManager()).isEqualTo(testManager);
        assertThat(result.getStatus()).isEqualTo(ActivityStatus.OPEN_REGISTRATION);
    }

    @Test
    public void createActivity_WithInvalidManager_ShouldThrowBadRequest() {
        // Given — manager is NOT in the project's monitors list
        when(projectRepository.findById("PRJ00001")).thenReturn(Optional.of(testProject));
        when(userRepository.findById("U0000001")).thenReturn(Optional.of(testManager));
        when(userRepository.findStaffByProjectId("PRJ00001")).thenReturn(List.of()); // empty

        // When & Then
        assertThatThrownBy(() -> activityService.createActivity(
                "Workshop", null, null,
                null, false, "PRJ00001", "U0000001"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("no pertenece al equipo del proyecto");
    }

    @Test
    public void createActivity_WithNonExistentProject_ShouldThrowNotFound() {
        // Given
        when(projectRepository.findById("INVALID")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> activityService.createActivity(
                "Workshop", null, null,
                null, false, "INVALID", null))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Project not found");
    }

    @Test
    public void createActivity_WithNonExistentManager_ShouldThrowNotFound() {
        // Given
        when(projectRepository.findById("PRJ00001")).thenReturn(Optional.of(testProject));
        when(userRepository.findById("INVALID")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> activityService.createActivity(
                "Workshop", null, null,
                null, false, "PRJ00001", "INVALID"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Manager user not found");
    }

    @Test
    public void createActivity_WithNullStatus_ShouldSucceed() {
        // Given
        when(projectRepository.findById("PRJ00001")).thenReturn(Optional.of(testProject));
        when(activityRepository.save(any(Activity.class))).thenAnswer(inv -> inv.getArgument(0));

        // When
        Activity result = activityService.createActivity(
                "Workshop", null, null,
                null, null, "PRJ00001", null);

        // Then
        assertThat(result.getStatus()).isNull();
        assertThat(result.isPublic()).isFalse(); // default
    }

    // ── getActivityById ─────────────────────────────────────────────────

    @Test
    public void getActivityById_WhenExists_ShouldReturn() {
        // Given
        Activity activity = Activity.builder()
                .id("ACT00001")
                .name("Workshop")
                .project(testProject)
                .build();
        when(activityRepository.findById("ACT00001")).thenReturn(Optional.of(activity));

        // When
        Activity result = activityService.getActivityById("ACT00001");

        // Then
        assertThat(result.getId()).isEqualTo("ACT00001");
        assertThat(result.getName()).isEqualTo("Workshop");
    }

    @Test
    public void getActivityById_WhenNotExists_ShouldThrowNotFound() {
        // Given
        when(activityRepository.findById("INVALID")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> activityService.getActivityById("INVALID"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Activity not found");
    }

    // ── getPublicActivities ─────────────────────────────────────────────

    @Test
    public void getPublicActivities_ShouldDelegateToRepository() {
        // Given
        Activity a1 = Activity.builder().id("ACT00001").name("A").project(testProject).build();
        Activity a2 = Activity.builder().id("ACT00002").name("B").project(testProject).build();
        when(activityRepository.findByIsPublicTrueOrderByDateAsc()).thenReturn(List.of(a1, a2));

        // When
        List<Activity> result = activityService.getPublicActivities();

        // Then
        assertThat(result).hasSize(2);
        verify(activityRepository).findByIsPublicTrueOrderByDateAsc();
    }

    // ── listActivities ──────────────────────────────────────────────────

    @Test
    public void listActivities_ShouldReturnPage() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        Activity a = Activity.builder().id("ACT00001").name("A").project(testProject).build();
        Page<Activity> page = new PageImpl<>(List.of(a), pageable, 1);
        when(activityRepository.findAll(org.mockito.ArgumentMatchers.<Specification<Activity>>any(), eq(pageable))).thenReturn(page);

        // When
        Page<Activity> result = activityService.listActivities(null, null, null, null, null, null, null, pageable);

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    // ── updateActivity ──────────────────────────────────────────────────

    @Test
    public void updateActivity_WithPartialFields_ShouldOnlyUpdateProvided() {
        // Given
        Activity existing = Activity.builder()
                .id("ACT00001")
                .name("Old Name")
                .description("Old Desc")
                .status(ActivityStatus.PLANNED)
                .isPublic(false)
                .project(testProject)
                .build();

        when(activityRepository.findById("ACT00001")).thenReturn(Optional.of(existing));
        when(activityRepository.save(any(Activity.class))).thenAnswer(inv -> inv.getArgument(0));

        // When — only update name and status
        Activity result = activityService.updateActivity(
                "ACT00001", "New Name", null, null,
                ActivityStatus.CLOSED, null, null, null);

        // Then
        assertThat(result.getName()).isEqualTo("New Name");
        assertThat(result.getStatus()).isEqualTo(ActivityStatus.CLOSED);
        assertThat(result.getDescription()).isEqualTo("Old Desc"); // untouched
        assertThat(result.isPublic()).isFalse(); // untouched
    }

    @Test
    public void updateActivity_WithEmptyManagerId_ShouldClearManager() {
        // Given
        Activity existing = Activity.builder()
                .id("ACT00001")
                .name("Workshop")
                .manager(testManager)
                .project(testProject)
                .build();

        when(activityRepository.findById("ACT00001")).thenReturn(Optional.of(existing));
        when(activityRepository.save(any(Activity.class))).thenAnswer(inv -> inv.getArgument(0));

        // When — empty string managerId clears manager
        Activity result = activityService.updateActivity(
                "ACT00001", null, null, null,
                null, null, null, "");

        // Then
        assertThat(result.getManager()).isNull();
    }

    @Test
    public void updateActivity_WithNewProject_ShouldUpdateProject() {
        // Given
        Project newProject = Project.builder().id("PRJ00002").name("New Project").build();
        Activity existing = Activity.builder()
                .id("ACT00001")
                .name("Workshop")
                .project(testProject)
                .build();

        when(activityRepository.findById("ACT00001")).thenReturn(Optional.of(existing));
        when(projectRepository.findById("PRJ00002")).thenReturn(Optional.of(newProject));
        when(activityRepository.save(any(Activity.class))).thenAnswer(inv -> inv.getArgument(0));

        // When
        Activity result = activityService.updateActivity(
                "ACT00001", null, null, null,
                null, null, "PRJ00002", null);

        // Then
        assertThat(result.getProject().getId()).isEqualTo("PRJ00002");
    }

    @Test
    public void updateActivity_WhenNotFound_ShouldThrowNotFound() {
        // Given
        when(activityRepository.findById("INVALID")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> activityService.updateActivity(
                "INVALID", "Name", null, null,
                null, null, null, null))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Activity not found");
    }

    // ── deleteActivity ──────────────────────────────────────────────────

    @Test
    public void deleteActivity_WhenExists_ShouldDelete() {
        // Given
        Activity activity = Activity.builder()
                .id("ACT00001")
                .name("Workshop")
                .project(testProject)
                .build();
        when(activityRepository.findById("ACT00001")).thenReturn(Optional.of(activity));

        // When
        activityService.deleteActivity("ACT00001");

        // Then
        verify(activityRepository).delete(activity);
    }

    @Test
    public void deleteActivity_WhenNotExists_ShouldThrowNotFound() {
        // Given
        when(activityRepository.findById("INVALID")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> activityService.deleteActivity("INVALID"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Activity not found");
    }

    // ── getStaffByProject ────────────────────────────────────────────

    @Test
    public void getStaffByProject_WhenProjectExists_ShouldReturnStaff() {
        // Given
        when(projectRepository.existsById("PRJ00001")).thenReturn(true);
        when(userRepository.findStaffByProjectId("PRJ00001")).thenReturn(List.of(testManager));

        // When
        List<User> result = activityService.getStaffByProject("PRJ00001");

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("U0000001");
    }

    @Test
    public void getStaffByProject_WhenProjectNotFound_ShouldThrow() {
        // Given
        when(projectRepository.existsById("INVALID")).thenReturn(false);

        // When & Then
        assertThatThrownBy(() -> activityService.getStaffByProject("INVALID"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Project not found");
    }
}
