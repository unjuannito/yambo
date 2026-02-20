package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.Project;
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
                                   String description, String image, Boolean featured) {
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
                .build();

        return projectRepository.save(project);
    }

    public Project updateProject(@NonNull String projectId, String name, Boolean active, String season,
                                  String description, String image, Boolean featured) {
        Project project = getProjectById(projectId);

        if (name != null && !name.trim().isEmpty()) {
            if (!name.equals(project.getName()) && projectRepository.existsByName(name)) {
                throw new BadRequestException("Project name already exists");
            }
            project.setName(name.trim());
        }

        if (active != null) {
            project.setActive(active);
        }

        if (season != null) {
            project.setSeason(season);
        }

        if (description != null) {
            project.setDescription(description);
        }

        if (image != null) {
            project.setImage(image);
        }

        if (featured != null) {
            project.setFeatured(featured);
        }

        return projectRepository.save(project);
    }

    public void deleteProject(@NonNull String projectId) {
        Project project = getProjectById(projectId);
        projectRepository.delete(project);
    }
}
