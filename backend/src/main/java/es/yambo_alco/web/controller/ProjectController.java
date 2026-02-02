package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.Product;
import es.yambo_alco.web.model.ProductOption;
import es.yambo_alco.web.model.Project;
import es.yambo_alco.web.service.ProductService;
import es.yambo_alco.web.service.ProjectService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final ProductService productService;

    @PostMapping
    @PreAuthorize("@permissionCheck.hasPermission('project', 'create')")
    public ResponseEntity<ProjectResponse> createProject(@Valid @RequestBody CreateProjectRequest request) {
        Project project = projectService.createProject(request.getName(), request.getActive(), request.getSeason());
        return ResponseEntity.status(HttpStatus.CREATED).body(new ProjectResponse(project));
    }

    @GetMapping
    public ResponseEntity<Page<ProjectResponse>> listProjects(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String season,
            Pageable pageable) {
        Page<Project> projects = projectService.listProjects(name, active, season, pageable);
        return ResponseEntity.ok(projects.map(ProjectResponse::new));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectResponse> getProject(@PathVariable String id) {
        Project project = projectService.getProjectById(id);
        return ResponseEntity.ok(new ProjectResponse(project));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('project', 'update')")
    public ResponseEntity<ProjectResponse> updateProject(
            @PathVariable String id,
            @Valid @RequestBody UpdateProjectRequest request) {
        Project project = projectService.updateProject(id, request.getName(), request.getActive(), request.getSeason());
        return ResponseEntity.ok(new ProjectResponse(project));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('project', 'delete')")
    public ResponseEntity<Void> deleteProject(@PathVariable String id) {
        projectService.deleteProject(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/products")
    public ResponseEntity<Page<ProjectProductResponse>> listProjectProducts(
            @PathVariable String id,
            @RequestParam(required = false) String name,
            @RequestParam(required = false, defaultValue = "true") Boolean active,
            Pageable pageable) {
        projectService.getProjectById(id);
        Page<Product> products = productService.listProductsForProject(id, name, active, pageable);
        return ResponseEntity.ok(products.map(ProjectProductResponse::new));
    }

    @Data
    public static class CreateProjectRequest {
        @NotBlank(message = "Name is required")
        private String name;

        private Boolean active;

        private String season;
    }

    @Data
    public static class UpdateProjectRequest {
        private String name;
        private Boolean active;
        private String season;
    }

    @Data
    public static class ProjectResponse {
        private String id;
        private String name;
        private boolean active;
        private String season;

        public ProjectResponse(Project project) {
            this.id = project.getId();
            this.name = project.getName();
            this.active = project.isActive();
            this.season = project.getSeason();
        }
    }

    @Data
    public static class ProjectProductResponse {
        private String id;
        private String name;
        private String projectId;
        private String familyProductId;
        private boolean active;
        private BigDecimal basePrice;
        private List<ProductOption> options;
        private List<String> images;

        public ProjectProductResponse(Product product) {
            this.id = product.getId();
            this.name = product.getName();
            this.projectId = product.getProjectId();
            this.familyProductId = product.getFamilyProduct() != null ? product.getFamilyProduct().getId() : null;
            this.active = product.isActive();
            this.basePrice = product.getBasePrice();
            this.options = product.getOptions();
            this.images = product.getImages();
        }
    }
}
