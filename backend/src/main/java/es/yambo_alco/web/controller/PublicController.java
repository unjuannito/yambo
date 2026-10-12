package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.Activity;
import es.yambo_alco.web.model.Project;
import es.yambo_alco.web.model.ProjectGroup;
import es.yambo_alco.web.model.SeoMetadata;
import es.yambo_alco.web.model.Settings;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.UserProjectGroup;
import es.yambo_alco.web.model.enums.SeoEntityType;
import es.yambo_alco.web.model.enums.UserProjectGroupRole;
import es.yambo_alco.web.repository.ActivityRepository;
import es.yambo_alco.web.repository.ProjectGroupRepository;
import es.yambo_alco.web.repository.ProjectRepository;
import es.yambo_alco.web.repository.UserRepository;
import es.yambo_alco.web.service.ActivityWaitlistService;
import es.yambo_alco.web.service.SeoMetadataService;
import es.yambo_alco.web.service.SettingsService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/public")
@RequiredArgsConstructor
public class PublicController {

    private final SettingsService settingsService;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ProjectGroupRepository projectGroupRepository;
    private final ActivityRepository activityRepository;
    private final SeoMetadataService seoMetadataService;
    private final ActivityWaitlistService activityWaitlistService;

    @GetMapping("/settings/home")
    public ResponseEntity<Map<String, String>> getHomeSettings() {
        List<Settings> settings = settingsService.getSettingsByCategory("home");
        Map<String, String> result = settings.stream()
                .collect(Collectors.toMap(Settings::getKey, Settings::getValue));
        return ResponseEntity.ok(result);
    }

    @GetMapping("/settings/contact")
    public ResponseEntity<Map<String, String>> getContactSettings() {
        List<Settings> settings = settingsService.getSettingsByCategory("contact");
        Map<String, String> result = settings.stream()
                .collect(Collectors.toMap(Settings::getKey, Settings::getValue));
        return ResponseEntity.ok(result);
    }

    @GetMapping("/projects/featured")
    public ResponseEntity<List<FeaturedProjectResponse>> getFeaturedProjects() {
        List<Project> projects = projectRepository.findByActiveTrueAndFeaturedTrue();
        List<FeaturedProjectResponse> response = projects.stream()
                .map(FeaturedProjectResponse::new)
                .toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/monitors")
    public ResponseEntity<List<StaffResponse>> getMonitors() {
        List<User> staff = userRepository.findStaff();
        List<StaffResponse> response = staff.stream()
                .filter(User::isPublicVisible)
                .map(StaffResponse::new)
                .toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/projects/active")
    public ResponseEntity<List<ActiveProjectResponse>> getActiveProjects() {
        List<Project> projects = projectRepository.findByActiveTrue();
        List<ActiveProjectResponse> response = projects.stream()
                .map(ActiveProjectResponse::new)
                .toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/activities")
    public ResponseEntity<List<PublicActivityResponse>> getPublicActivities() {
        List<Activity> activities = activityRepository.findByIsPublicTrueOrderByDateDesc();
        List<PublicActivityResponse> response = activities.stream()
                .map(PublicActivityResponse::new)
                .toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/activities/{id}")
    public ResponseEntity<PublicActivityDetailResponse> getPublicActivity(@PathVariable String id) {
        Activity activity = activityRepository.findByIdAndIsPublicTrue(id)
                .orElseThrow(() -> new es.yambo_alco.web.exception.ResourceNotFoundException("Activity not found"));
        SeoMetadata seo = seoMetadataService.getByEntity(SeoEntityType.ACTIVITY, id).orElse(null);
        return ResponseEntity.ok(new PublicActivityDetailResponse(activity, seo));
    }

    @PostMapping("/activities/{id}/waitlist")
    public ResponseEntity<Map<String, String>> joinWaitlist(
            @PathVariable String id,
            @Valid @RequestBody WaitlistRequest request) {
        activityWaitlistService.register(id, request.getEmail());
        return ResponseEntity.ok(Map.of("message", "Te avisaremos cuando se abran las inscripciones"));
    }

    @Data
    public static class WaitlistRequest {
        @NotBlank(message = "El email es obligatorio")
        @Email(message = "Email no válido")
        private String email;
    }

    @GetMapping("/projects/{id}")
    public ResponseEntity<ProjectDetailResponse> getProjectDetail(@PathVariable String id) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new es.yambo_alco.web.exception.ResourceNotFoundException("Project not found"));
        List<ProjectGroup> groups = projectGroupRepository.findByProjectId(id);
        List<User> staff = userRepository.findStaffByProjectId(id);
        SeoMetadata seo = seoMetadataService.getByEntity(SeoEntityType.PROJECT, id).orElse(null);
        return ResponseEntity.ok(new ProjectDetailResponse(project, groups, staff, seo));
    }

    @GetMapping("/projects/{id}/seo")
    public ResponseEntity<SeoMetadataResponse> getProjectSeo(@PathVariable String id) {
        projectRepository.findById(id)
                .orElseThrow(() -> new es.yambo_alco.web.exception.ResourceNotFoundException("Project not found"));
        SeoMetadata seo = seoMetadataService.getByEntity(SeoEntityType.PROJECT, id)
                .orElseThrow(() -> new es.yambo_alco.web.exception.ResourceNotFoundException("SEO metadata not found"));
        return ResponseEntity.ok(new SeoMetadataResponse(seo));
    }

    @Data
    public static class FeaturedProjectResponse {
        private String id;
        private String name;
        private String description;
        private String image;
        private String signatureColor;
        private String coordinationEmail;

        public FeaturedProjectResponse(Project project) {
            this.id = project.getId();
            this.name = project.getName();
            this.description = project.getDescription();
            this.image = project.getImage();
            this.signatureColor = project.getSignatureColor();
            this.coordinationEmail = project.getCoordinationEmail();
        }
    }

    @Data
    public static class StaffResponse {
        private String id;
        private String name;
        private String nickname;
        private String photo;
        private String bio;
        private String funFact;
        private String role;
        private StaffGroupResponse[] groups;

        public StaffResponse(User user) {
            this.id = user.getId();
            this.name = user.getName();
            this.nickname = user.getNickname();
            this.photo = user.getPhoto();
            this.bio = user.getBio();
            this.funFact = user.getFunFact();

            // Determine primary role from groupRoles
            boolean isCoordinator = user.getGroupRoles().stream()
                    .anyMatch(gr -> gr.getRole() == UserProjectGroupRole.COORDINATOR);
            boolean isMonitor = user.getGroupRoles().stream()
                    .anyMatch(gr -> gr.getRole() == UserProjectGroupRole.MONITOR);
            if (isCoordinator && isMonitor) {
                this.role = "BOTH";
            } else if (isCoordinator) {
                this.role = "COORDINATOR";
            } else {
                this.role = "MONITOR";
            }

            this.groups = user.getGroupRoles().stream()
                    .map(StaffGroupResponse::new)
                    .toArray(StaffGroupResponse[]::new);
        }
    }

    @Data
    public static class StaffGroupResponse {
        private String id;
        private String name;
        private String projectName;
        private String role;

        public StaffGroupResponse(UserProjectGroup upg) {
            this.id = upg.getProjectGroup().getId();
            this.name = upg.getProjectGroup().getName();
            this.projectName = upg.getProjectGroup().getProject().getName();
            this.role = upg.getRole().name();
        }
    }

    @Data
    public static class ActiveProjectResponse {
        private String id;
        private String name;
        private String season;
        private String description;
        private String image;
        private boolean featured;
        private String signatureColor;
        private String coordinationEmail;

        public ActiveProjectResponse(Project project) {
            this.id = project.getId();
            this.name = project.getName();
            this.season = project.getSeason();
            this.description = project.getDescription();
            this.image = project.getImage();
            this.featured = project.isFeatured();
            this.signatureColor = project.getSignatureColor();
            this.coordinationEmail = project.getCoordinationEmail();
        }
    }

    @Data
    public static class ProjectDetailResponse {
        private String id;
        private String name;
        private String season;
        private String description;
        private String image;
        private String signatureColor;
        private String coordinationEmail;
        private List<ProjectGroupDetail> groups;
        private List<StaffResponse> staff;
        private SeoMetadataResponse seo;

        public ProjectDetailResponse(Project project, List<ProjectGroup> groups, List<User> staff, SeoMetadata seo) {
            this.id = project.getId();
            this.name = project.getName();
            this.season = project.getSeason();
            this.description = project.getDescription();
            this.image = project.getImage();
            this.signatureColor = project.getSignatureColor();
            this.coordinationEmail = project.getCoordinationEmail();
            this.groups = groups.stream()
                    .map(ProjectGroupDetail::new)
                    .toList();
            this.staff = staff.stream()
                    .filter(User::isPublicVisible)
                    .map(StaffResponse::new)
                    .toList();
            this.seo = seo != null ? new SeoMetadataResponse(seo) : null;
        }
    }

    @Data
    public static class ProjectGroupDetail {
        private String id;
        private String name;

        public ProjectGroupDetail(ProjectGroup group) {
            this.id = group.getId();
            this.name = group.getName();
        }
    }

    @Data
    public static class PublicActivityResponse {
        private String id;
        private String name;
        private String description;
        private String image;
        private String location;
        private java.math.BigDecimal price;
        private java.time.LocalDateTime date;
        private java.time.LocalDateTime endDate;
        private ActivityController.StatusInfo status;
        private ActivityProjectSummary project;
        private ActivityManagerSummary manager;

        public PublicActivityResponse(Activity activity) {
            this.id = activity.getId();
            this.name = activity.getName();
            this.description = activity.getDescription();
            this.image = activity.getImage();
            this.location = activity.getLocation();
            this.price = activity.getPrice();
            this.date = activity.getDate();
            this.endDate = activity.getEndDate();
            this.status = activity.getStatus() != null
                    ? new ActivityController.StatusInfo(activity.getStatus().name(), activity.getStatus().getLabel(), activity.getStatus().getColor())
                    : null;
            if (activity.getProject() != null) {
                this.project = new ActivityProjectSummary(
                        activity.getProject().getId(), activity.getProject().getName());
            }
            if (activity.getManager() != null) {
                this.manager = new ActivityManagerSummary(
                        activity.getManager().getName(), activity.getManager().getPhoto());
            }
        }
    }

    @Data
    public static class ActivityProjectSummary {
        private String id;
        private String name;

        public ActivityProjectSummary(String id, String name) {
            this.id = id;
            this.name = name;
        }
    }

    @Data
    public static class PublicActivityDetailResponse {
        private String id;
        private String name;
        private String description;
        private String image;
        private String location;
        private java.math.BigDecimal price;
        private java.time.LocalDateTime date;
        private java.time.LocalDateTime endDate;
        private ActivityController.StatusInfo status;
        private ActivityProjectSummary project;
        private ActivityManagerSummary manager;
        private SeoMetadataResponse seo;

        public PublicActivityDetailResponse(Activity activity, SeoMetadata seo) {
            this.id = activity.getId();
            this.name = activity.getName();
            this.description = activity.getDescription();
            this.image = activity.getImage();
            this.location = activity.getLocation();
            this.price = activity.getPrice();
            this.date = activity.getDate();
            this.endDate = activity.getEndDate();
            this.status = activity.getStatus() != null
                    ? new ActivityController.StatusInfo(activity.getStatus().name(), activity.getStatus().getLabel(), activity.getStatus().getColor())
                    : null;
            if (activity.getProject() != null) {
                this.project = new ActivityProjectSummary(
                        activity.getProject().getId(), activity.getProject().getName());
            }
            if (activity.getManager() != null) {
                this.manager = new ActivityManagerSummary(
                        activity.getManager().getName(), activity.getManager().getPhoto());
            }
            this.seo = seo != null ? new SeoMetadataResponse(seo) : null;
        }
    }

    @Data
    public static class ActivityManagerSummary {
        private String name;
        private String photo;

        public ActivityManagerSummary(String name, String photo) {
            this.name = name;
            this.photo = photo;
        }
    }

    @Data
    public static class SeoMetadataResponse {
        private String metaDescription;
        private List<String> keywords;
        private String ogDescription;
        private String slug;

        public SeoMetadataResponse(SeoMetadata seo) {
            this.metaDescription = seo.getMetaDescription();
            this.ogDescription = seo.getOgDescription();
            this.slug = seo.getSlug();
            // Parse keywords JSON array
            try {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                this.keywords = mapper.readValue(
                        seo.getKeywords(),
                        mapper.getTypeFactory().constructCollectionType(List.class, String.class));
            } catch (Exception e) {
                this.keywords = Collections.emptyList();
            }
        }
    }
}
