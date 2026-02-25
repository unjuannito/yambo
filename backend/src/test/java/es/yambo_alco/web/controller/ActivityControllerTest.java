package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.model.Activity;
import es.yambo_alco.web.model.Project;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.ActivityStatus;
import es.yambo_alco.web.service.ActivityService;
import es.yambo_alco.web.util.PermissionCheckService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = ActivityController.class)
@Import(TestSecurityConfig.class)
@SuppressWarnings("null")
class ActivityControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ActivityService activityService;

    @MockitoBean
    private PermissionCheckService permissionCheckService;

    @BeforeEach
    void setUp() {
        when(permissionCheckService.hasPermission(anyString(), anyString())).thenReturn(true);
    }

    private Activity createTestActivity() {
        Project project = Project.builder()
                .id("PRJ00001")
                .name("Test Project")
                .build();

        User manager = User.builder()
                .id("U0000001")
                .name("Test Manager")
                .email("manager@example.com")
                .password("password")
                .photo("/uploads/photo.jpg")
                .profiles(Set.of())
                .build();

        return Activity.builder()
                .id("ACT00001")
                .name("Workshop")
                .description("A great workshop")
                .date(LocalDateTime.of(2026, 3, 15, 10, 0))
                .status(ActivityStatus.PLANNED)
                .isPublic(true)
                .project(project)
                .manager(manager)
                .build();
    }

    // ── POST /activities ────────────────────────────────────────────────

    @Test
    @WithMockUser
    void createActivity_ShouldReturnCreated() throws Exception {
        // Given
        Activity activity = createTestActivity();
        when(activityService.createActivity(
                anyString(), anyString(), any(), any(), any(), anyString(), anyString()))
                .thenReturn(activity);

        String json = """
                {
                    "name": "Workshop",
                    "description": "A great workshop",
                    "date": "2026-03-15T10:00:00",
                    "status": "PLANNED",
                    "public": true,
                    "projectId": "PRJ00001",
                    "managerId": "U0000001"
                }
                """;

        // When & Then
        mockMvc.perform(post("/activities")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("ACT00001"))
                .andExpect(jsonPath("$.name").value("Workshop"))
                .andExpect(jsonPath("$.description").value("A great workshop"))
                .andExpect(jsonPath("$.status.value").value("PLANNED"))
                .andExpect(jsonPath("$.status.label").value("Planificada"))
                .andExpect(jsonPath("$.status.color").value("#3b82f6"))
                .andExpect(jsonPath("$.public").value(true))
                .andExpect(jsonPath("$.project.id").value("PRJ00001"))
                .andExpect(jsonPath("$.project.name").value("Test Project"))
                .andExpect(jsonPath("$.manager.id").value("U0000001"))
                .andExpect(jsonPath("$.manager.name").value("Test Manager"));
    }

    @Test
    @WithMockUser
    void createActivity_WithNullStatus_ShouldReturnCreated() throws Exception {
        // Given
        Activity activity = createTestActivity();
        activity.setStatus(null);
        when(activityService.createActivity(
                anyString(), any(), any(), isNull(), any(), anyString(), any()))
                .thenReturn(activity);

        String json = """
                {
                    "name": "Workshop",
                    "projectId": "PRJ00001"
                }
                """;

        // When & Then
        mockMvc.perform(post("/activities")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("ACT00001"))
                .andExpect(jsonPath("$.status").isEmpty());
    }

    @Test
    @WithMockUser
    void createActivity_WithoutName_ShouldReturnBadRequest() throws Exception {
        // Given — name is @NotBlank
        String json = """
                {
                    "description": "No name",
                    "projectId": "PRJ00001"
                }
                """;

        // When & Then
        mockMvc.perform(post("/activities")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void createActivity_WithoutProjectId_ShouldReturnBadRequest() throws Exception {
        // Given — projectId is @NotBlank
        String json = """
                {
                    "name": "Workshop"
                }
                """;

        // When & Then
        mockMvc.perform(post("/activities")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isBadRequest());
    }

    // ── GET /activities ─────────────────────────────────────────────────

    @Test
    @WithMockUser
    void listActivities_ShouldReturnPage() throws Exception {
        // Given
        Activity activity = createTestActivity();
        PageImpl<Activity> page = new PageImpl<>(List.of(activity), PageRequest.of(0, 20), 1);
        when(activityService.listActivities(any())).thenReturn(page);

        // When & Then
        mockMvc.perform(get("/activities"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].id").value("ACT00001"))
                .andExpect(jsonPath("$.content[0].name").value("Workshop"))
                .andExpect(jsonPath("$.content[0].status.value").value("PLANNED"));
    }

    // ── GET /activities/{id} ────────────────────────────────────────────

    @Test
    @WithMockUser
    void getActivity_ShouldReturnOk() throws Exception {
        // Given
        Activity activity = createTestActivity();
        when(activityService.getActivityById("ACT00001")).thenReturn(activity);

        // When & Then
        mockMvc.perform(get("/activities/ACT00001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("ACT00001"))
                .andExpect(jsonPath("$.name").value("Workshop"))
                .andExpect(jsonPath("$.status.value").value("PLANNED"))
                .andExpect(jsonPath("$.status.label").value("Planificada"))
                .andExpect(jsonPath("$.status.color").value("#3b82f6"))
                .andExpect(jsonPath("$.manager.photo").value("/uploads/photo.jpg"));
    }

    // ── PUT /activities/{id} ────────────────────────────────────────────

    @Test
    @WithMockUser
    void updateActivity_ShouldReturnOk() throws Exception {
        // Given
        Activity updated = createTestActivity();
        updated.setName("Updated Workshop");
        updated.setStatus(ActivityStatus.CLOSED);
        when(activityService.updateActivity(
                eq("ACT00001"), anyString(), any(), any(), any(), any(), any(), any()))
                .thenReturn(updated);

        String json = """
                {
                    "name": "Updated Workshop",
                    "status": "CLOSED"
                }
                """;

        // When & Then
        mockMvc.perform(put("/activities/ACT00001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Workshop"))
                .andExpect(jsonPath("$.status.value").value("CLOSED"))
                .andExpect(jsonPath("$.status.label").value("Cerrada"));
    }

    // ── DELETE /activities/{id} ─────────────────────────────────────────

    @Test
    @WithMockUser
    void deleteActivity_ShouldReturnNoContent() throws Exception {
        // Given
        doNothing().when(activityService).deleteActivity("ACT00001");

        // When & Then
        mockMvc.perform(delete("/activities/ACT00001"))
                .andExpect(status().isNoContent());

        verify(activityService).deleteActivity("ACT00001");
    }

    // ── GET /activities/projects/{projectId}/monitors ────────────────────

    @Test
    @WithMockUser
    void getProjectMonitors_ShouldReturnList() throws Exception {
        // Given
        User monitor = User.builder()
                .id("U0000001")
                .name("Monitor User")
                .photo("/uploads/photo.jpg")
                .build();
        when(activityService.getMonitorsByProject("PRJ00001")).thenReturn(List.of(monitor));

        // When & Then
        mockMvc.perform(get("/activities/projects/PRJ00001/monitors"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value("U0000001"))
                .andExpect(jsonPath("$[0].name").value("Monitor User"))
                .andExpect(jsonPath("$[0].photo").value("/uploads/photo.jpg"));
    }

    // ── Security ────────────────────────────────────────────────────────

    @Test
    @WithAnonymousUser
    void createActivity_Unauthenticated_ShouldReturnForbidden() throws Exception {
        when(permissionCheckService.hasPermission(anyString(), anyString())).thenReturn(false);

        String json = """
                {
                    "name": "Workshop",
                    "projectId": "PRJ00001"
                }
                """;

        mockMvc.perform(post("/activities")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithAnonymousUser
    void listActivities_Unauthenticated_ShouldReturnForbidden() throws Exception {
        when(permissionCheckService.hasPermission(anyString(), anyString())).thenReturn(false);

        mockMvc.perform(get("/activities"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithAnonymousUser
    void deleteActivity_Unauthenticated_ShouldReturnForbidden() throws Exception {
        when(permissionCheckService.hasPermission(anyString(), anyString())).thenReturn(false);

        mockMvc.perform(delete("/activities/ACT00001"))
                .andExpect(status().isForbidden());
    }
}
