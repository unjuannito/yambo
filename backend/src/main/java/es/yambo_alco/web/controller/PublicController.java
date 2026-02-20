package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.Project;
import es.yambo_alco.web.model.ProjectGroup;
import es.yambo_alco.web.model.Settings;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.ProjectGroupRepository;
import es.yambo_alco.web.repository.ProjectRepository;
import es.yambo_alco.web.repository.UserRepository;
import es.yambo_alco.web.service.SettingsService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<List<MonitorResponse>> getMonitors() {
        List<User> monitors = userRepository.findMonitors();
        List<MonitorResponse> response = monitors.stream()
                .map(MonitorResponse::new)
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

    @GetMapping("/projects/{id}")
    public ResponseEntity<ProjectDetailResponse> getProjectDetail(@PathVariable String id) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new es.yambo_alco.web.exception.ResourceNotFoundException("Project not found"));
        List<ProjectGroup> groups = projectGroupRepository.findByProjectId(id);
        List<User> monitors = userRepository.findMonitorsByProjectId(id);
        return ResponseEntity.ok(new ProjectDetailResponse(project, groups, monitors));
    }

    @Data
    public static class FeaturedProjectResponse {
        private String id;
        private String name;
        private String description;
        private String image;

        public FeaturedProjectResponse(Project project) {
            this.id = project.getId();
            this.name = project.getName();
            this.description = project.getDescription();
            this.image = project.getImage();
        }
    }

    @Data
    public static class MonitorResponse {
        private String id;
        private String name;
        private String photo;
        private String bio;
        private MonitorGroupResponse[] groups;

        public MonitorResponse(User user) {
            this.id = user.getId();
            this.name = user.getName();
            this.photo = user.getPhoto();
            this.bio = user.getBio();
            this.groups = user.getGroups().stream()
                    .map(MonitorGroupResponse::new)
                    .toArray(MonitorGroupResponse[]::new);
        }
    }

    @Data
    public static class MonitorGroupResponse {
        private String id;
        private String name;
        private String projectName;

        public MonitorGroupResponse(ProjectGroup group) {
            this.id = group.getId();
            this.name = group.getName();
            this.projectName = group.getProject().getName();
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

        public ActiveProjectResponse(Project project) {
            this.id = project.getId();
            this.name = project.getName();
            this.season = project.getSeason();
            this.description = project.getDescription();
            this.image = project.getImage();
            this.featured = project.isFeatured();
        }
    }

    @Data
    public static class ProjectDetailResponse {
        private String id;
        private String name;
        private String season;
        private String description;
        private String image;
        private List<ProjectGroupDetail> groups;
        private List<MonitorResponse> monitors;

        public ProjectDetailResponse(Project project, List<ProjectGroup> groups, List<User> monitors) {
            this.id = project.getId();
            this.name = project.getName();
            this.season = project.getSeason();
            this.description = project.getDescription();
            this.image = project.getImage();
            this.groups = groups.stream()
                    .map(ProjectGroupDetail::new)
                    .toList();
            this.monitors = monitors.stream()
                    .map(MonitorResponse::new)
                    .toList();
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
}
