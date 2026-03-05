package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.Activity;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.ActivityStatus;
import es.yambo_alco.web.service.ActivityService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/activities")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService activityService;

    @PostMapping
    @PreAuthorize("@permissionCheck.hasPermission('activity', 'create')")
    public ResponseEntity<ActivityResponse> createActivity(@Valid @RequestBody CreateActivityRequest request) {
        Activity activity = activityService.createActivity(
                request.getName(), request.getDescription(), request.getDate(),
                request.getStatus(), request.getIsPublic(),
                request.getProjectId(), request.getManagerId());
        return ResponseEntity.status(HttpStatus.CREATED).body(new ActivityResponse(activity));
    }

    @GetMapping
    @PreAuthorize("@permissionCheck.hasPermission('activity', 'read')")
    public ResponseEntity<Page<ActivityResponse>> listActivities(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) ActivityStatus status,
            @RequestParam(required = false) Boolean isPublic,
            @RequestParam(required = false) String projectId,
            @RequestParam(required = false) String managerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            Pageable pageable) {
        Page<Activity> activities = activityService.listActivities(name, status, isPublic, projectId, managerId, startDate, endDate, pageable);
        return ResponseEntity.ok(activities.map(ActivityResponse::new));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('activity', 'read')")
    public ResponseEntity<ActivityResponse> getActivity(@PathVariable String id) {
        Activity activity = activityService.getActivityById(id);
        return ResponseEntity.ok(new ActivityResponse(activity));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('activity', 'update')")
    public ResponseEntity<ActivityResponse> updateActivity(
            @PathVariable String id,
            @Valid @RequestBody UpdateActivityRequest request) {
        Activity activity = activityService.updateActivity(
                id, request.getName(), request.getDescription(), request.getDate(),
                request.getStatus(), request.getIsPublic(),
                request.getProjectId(), request.getManagerId());
        return ResponseEntity.ok(new ActivityResponse(activity));
    }

    @GetMapping("/projects/{projectId}/monitors")
    @PreAuthorize("@permissionCheck.hasPermission('activity', 'read')")
    public ResponseEntity<List<ManagerSummary>> getProjectMonitors(@PathVariable String projectId) {
        List<User> monitors = activityService.getMonitorsByProject(projectId);
        List<ManagerSummary> response = monitors.stream()
                .map(u -> new ManagerSummary(u.getId(), u.getName(), u.getPhoto()))
                .toList();
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('activity', 'delete')")
    public ResponseEntity<Void> deleteActivity(@PathVariable String id) {
        activityService.deleteActivity(id);
        return ResponseEntity.noContent().build();
    }

    // ── DTOs ────────────────────────────────────────────────────────────

    @Data
    public static class CreateActivityRequest {
        @NotBlank(message = "Name is required")
        private String name;

        private String description;
        private LocalDateTime date;
        private ActivityStatus status;
        @JsonProperty("public")
        private Boolean isPublic;

        @NotBlank(message = "Project ID is required")
        private String projectId;

        private String managerId;
    }

    @Data
    public static class UpdateActivityRequest {
        private String name;
        private String description;
        private LocalDateTime date;
        private ActivityStatus status;
        @JsonProperty("public")
        private Boolean isPublic;
        private String projectId;
        private String managerId;
    }

    @Data
    public static class ActivityResponse {
        private String id;
        private String name;
        private String description;
        private LocalDateTime date;
        private StatusInfo status;
        @JsonProperty("public")
        private boolean isPublic;
        private ProjectSummary project;
        private ManagerSummary manager;

        public ActivityResponse(Activity activity) {
            this.id = activity.getId();
            this.name = activity.getName();
            this.description = activity.getDescription();
            this.date = activity.getDate();
            this.status = activity.getStatus() != null
                    ? new StatusInfo(activity.getStatus().name(), activity.getStatus().getLabel(), activity.getStatus().getColor())
                    : null;
            this.isPublic = activity.isPublic();
            if (activity.getProject() != null) {
                this.project = new ProjectSummary(activity.getProject().getId(), activity.getProject().getName());
            }
            if (activity.getManager() != null) {
                this.manager = new ManagerSummary(activity.getManager().getId(), activity.getManager().getName(), activity.getManager().getPhoto());
            }
        }
    }

    @Data
    public static class StatusInfo {
        private String value;
        private String label;
        private String color;

        public StatusInfo(String value, String label, String color) {
            this.value = value;
            this.label = label;
            this.color = color;
        }
    }

    @Data
    public static class ProjectSummary {
        private String id;
        private String name;

        public ProjectSummary(String id, String name) {
            this.id = id;
            this.name = name;
        }
    }

    @Data
    public static class ManagerSummary {
        private String id;
        private String name;
        private String photo;

        public ManagerSummary(String id, String name, String photo) {
            this.id = id;
            this.name = name;
            this.photo = photo;
        }
    }
}
