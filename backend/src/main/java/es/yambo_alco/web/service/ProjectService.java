package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.Project;
import es.yambo_alco.web.model.ProjectGroup;
import es.yambo_alco.web.model.enums.SeoEntityType;
import es.yambo_alco.web.repository.ProjectGroupRepository;
import es.yambo_alco.web.repository.ProjectRepository;
import es.yambo_alco.web.repository.spec.ProjectSpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectGroupRepository projectGroupRepository;
    private final SeoMetadataService seoMetadataService;

    public Project getProjectById(@NonNull String projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
    }

    public Page<Project> listProjects(String name, Boolean active, String season, @NonNull Pageable pageable) {
        Specification<Project> spec = Specification.where(null);
        spec = spec.and(ProjectSpecifications.nameContains(name));
        spec = spec.and(ProjectSpecifications.activeEquals(active));
        spec = spec.and(ProjectSpecifications.seasonEquals(season));
        return projectRepository.findAll(spec, pageable);
    }

    public Project createProject(@NonNull String name, Boolean active, String season,
                                   String description, String image, Boolean featured,
                                   String signatureColor) {
        if (projectRepository.existsByName(name)) {
            throw new BadRequestException("Project name already exists");
        }

        Project project = Project.builder()
                .name(name)
                .active(active != null ? active : true)
                .season(season)
                .description(description)
                .image(image)
                .featured(featured != null ? featured : false)
                .signatureColor(signatureColor)
                .build();

        Project saved = projectRepository.save(project);

        // Auto-create project-level group for coordinator assignments
        ProjectGroup projectLevelGroup = ProjectGroup.builder()
                .name(null)
                .project(saved)
                .build();
        projectGroupRepository.save(projectLevelGroup);

        seoMetadataService.generateAndSaveForProject(saved);
        return saved;
    }

    public Project updateProject(@NonNull String projectId, String name, Boolean active, String season,
                                  String description, String image, Boolean featured,
                                  String signatureColor) {
        Project project = getProjectById(projectId);

        boolean seoRelevantChange = false;

        if (name != null && !name.trim().isEmpty()) {
            if (!name.equals(project.getName()) && projectRepository.existsByName(name)) {
                throw new BadRequestException("Project name already exists");
            }
            if (!name.trim().equals(project.getName())) {
                seoRelevantChange = true;
            }
            project.setName(name.trim());
        }

        if (active != null) {
            project.setActive(active);
        }

        if (season != null) {
            if (!season.equals(project.getSeason())) {
                seoRelevantChange = true;
            }
            project.setSeason(season);
        }

        if (description != null) {
            if (!description.equals(project.getDescription())) {
                seoRelevantChange = true;
            }
            project.setDescription(description);
        }

        if (image != null) {
            project.setImage(image);
        }

        if (featured != null) {
            project.setFeatured(featured);
        }

        if (signatureColor != null) {
            project.setSignatureColor(signatureColor.isEmpty() ? null : signatureColor);
        }

        Project saved = projectRepository.save(project);

        if (seoRelevantChange) {
            seoMetadataService.generateAndSaveForProject(saved);
        }

        return saved;
    }

    public void deleteProject(@NonNull String projectId) {
        Project project = getProjectById(projectId);
        seoMetadataService.deleteByEntity(SeoEntityType.PROJECT, projectId);
        projectRepository.delete(project);
    }
}
