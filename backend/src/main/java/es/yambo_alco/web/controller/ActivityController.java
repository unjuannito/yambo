package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.Activity;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.ActivityStatus;
import es.yambo_alco.web.service.ActivityService;
import es.yambo_alco.web.service.ActivityWaitlistService;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/activities")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService activityService;
    private final ActivityWaitlistService activityWaitlistService;

    @PostMapping
    @PreAuthorize("@permissionCheck.hasPermission('activity', 'create')")
    public ResponseEntity<ActivityResponse> createActivity(@Valid @RequestBody CreateActivityRequest request) {
        Activity activity = activityService.createActivity(
            request.getName(), request.getDescription(), request.getImage(), request.getLocation(), request.getPrice(), request.getDate(), request.getEndDate(),
                request.getStatus(), request.getIsPublic(),
                request.getProjectId(), request.getManagerId());
        ActivityResponse response = new ActivityResponse(activity);
        response.setWaitlistCount(activityWaitlistService.getCount(activity.getId()));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
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
        return ResponseEntity.ok(activities.map(a -> {
            ActivityResponse resp = new ActivityResponse(a);
            resp.setWaitlistCount(activityWaitlistService.getCount(a.getId()));
            return resp;
        }));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('activity', 'read')")
    public ResponseEntity<ActivityResponse> getActivity(@PathVariable String id) {
        Activity activity = activityService.getActivityById(id);
        ActivityResponse response = new ActivityResponse(activity);
        response.setWaitlistCount(activityWaitlistService.getCount(activity.getId()));
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('activity', 'update')")
    public ResponseEntity<ActivityResponse> updateActivity(
            @PathVariable String id,
            @Valid @RequestBody UpdateActivityRequest request) {
        Activity activity = activityService.updateActivity(
            id, request.getName(), request.getDescription(), request.getImage(), request.getLocation(), request.getPrice(), request.getDate(), request.getEndDate(),
                request.getStatus(), request.getIsPublic(),
                request.getProjectId(), request.getManagerId());
        ActivityResponse response = new ActivityResponse(activity);
        response.setWaitlistCount(activityWaitlistService.getCount(activity.getId()));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/projects/{projectId}/staff")
    @PreAuthorize("@permissionCheck.hasPermission('activity', 'read')")
    public ResponseEntity<List<ManagerSummary>> getProjectStaff(@PathVariable String projectId) {
        List<User> staff = activityService.getStaffByProject(projectId);
        List<ManagerSummary> response = staff.stream()
                .map(u -> new ManagerSummary(u.getId(), u.getName(), u.getStaffPhoto()))
                .toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/staff")
    @PreAuthorize("@permissionCheck.hasPermission('activity', 'read')")
    public ResponseEntity<List<ManagerSummary>> getAllStaff() {
        List<User> staff = activityService.getAllStaff();
        List<ManagerSummary> response = staff.stream()
                .map(u -> new ManagerSummary(u.getId(), u.getName(), u.getStaffPhoto()))
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
        private String image;
        private String location;
        private BigDecimal price;
        private LocalDateTime date;
        private LocalDateTime endDate;
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
        private String image;
        private String location;
        private BigDecimal price;
        private LocalDateTime date;
        private LocalDateTime endDate;
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
        private String image;
        private String location;
        private BigDecimal price;
        private LocalDateTime date;
        private LocalDateTime endDate;
        private StatusInfo status;
        @JsonProperty("public")
        private boolean isPublic;
        private ProjectSummary project;
        private ManagerSummary manager;
        private long waitlistCount;

        public ActivityResponse(Activity activity) {
            this.id = activity.getId();
            this.name = activity.getName();
            this.description = activity.getDescription();
            this.image = activity.getImage();
            this.location = activity.getLocation();
            this.price = activity.getPrice();
            this.date = activity.getDate();
            this.endDate = activity.getEndDate();
            this.status = activity.getStatus() != null
                    ? new StatusInfo(activity.getStatus().name(), activity.getStatus().getLabel(), activity.getStatus().getColor())
                    : null;
            this.isPublic = activity.isPublic();
            if (activity.getProject() != null) {
                this.project = new ProjectSummary(activity.getProject().getId(), activity.getProject().getName());
            }
            if (activity.getManager() != null) {
                this.manager = new ManagerSummary(activity.getManager().getId(), activity.getManager().getName(), activity.getManager().getStaffPhoto());
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
