package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.Project;
import es.yambo_alco.web.model.enums.SeoEntityType;
import es.yambo_alco.web.repository.ProjectGroupRepository;
import es.yambo_alco.web.repository.ProjectRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class ProjectServiceTest {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private ProjectGroupRepository projectGroupRepository;

    @Mock
    private SeoMetadataService seoMetadataService;

    @InjectMocks
    private ProjectService projectService;

    @Test
    void getProjectById_WhenProjectExists_ShouldReturnProject() {
        // Given
        Project project = Project.builder().id("PRJ001").name("Project 1").active(true).build();
        when(projectRepository.findById("PRJ001")).thenReturn(Optional.of(project));

        // When
        Project result = projectService.getProjectById("PRJ001");

        // Then
        assertEquals(project, result);
        verify(projectRepository).findById("PRJ001");
    }

    @Test
    void getProjectById_WhenProjectDoesNotExist_ShouldThrowException() {
        when(projectRepository.findById("PRJ404")).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> projectService.getProjectById("PRJ404"));
        assertEquals("Project not found", exception.getMessage());
        verify(projectRepository).findById("PRJ404");
    }

    @Test
    void listProjects_ShouldReturnFilteredProjects() {
        Pageable pageable = PageRequest.of(0, 10);
        List<Project> projects = List.of(
                Project.builder().id("PRJ001").name("Project 1").active(true).build(),
                Project.builder().id("PRJ002").name("Project 2").active(false).build()
        );
        Page<Project> expected = new PageImpl<>(projects, pageable, projects.size());

        doReturn(expected).when(projectRepository).findAll(org.mockito.ArgumentMatchers.<Specification<Project>>any(), eq(pageable));

        Page<Project> result = projectService.listProjects("Project", null, null, pageable);

        assertEquals(expected, result);
        verify(projectRepository).findAll(org.mockito.ArgumentMatchers.<Specification<Project>>any(), eq(pageable));
    }

    @Test
    void createProject_WhenValidData_ShouldCreateProject() {
        Project saved = Project.builder().id("PRJ001").name("New Project").active(true).build();
        when(projectRepository.existsByName("New Project")).thenReturn(false);
        when(projectRepository.save(any(Project.class))).thenReturn(saved);

        Project result = projectService.createProject("New Project", null, "2025", null, null, null);

        assertEquals(saved, result);
        verify(projectRepository).existsByName("New Project");
        verify(projectRepository).save(any(Project.class));
        verify(seoMetadataService).generateAndSaveForProject(saved);
    }

    @Test
    void createProject_WhenNameAlreadyExists_ShouldThrowException() {
        when(projectRepository.existsByName("Existing"))
                .thenReturn(true);

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> projectService.createProject("Existing", true, null, null, null, null));
        assertEquals("Project name already exists", exception.getMessage());
        verify(projectRepository).existsByName("Existing");
        verify(projectRepository, never()).save(any());
    }

    @Test
    void updateProject_WhenValidData_ShouldUpdateProject() {
        Project existing = Project.builder().id("PRJ001").name("Old").active(true).build();
        Project saved = Project.builder().id("PRJ001").name("New").active(false).build();

        when(projectRepository.findById("PRJ001")).thenReturn(Optional.of(existing));
        when(projectRepository.existsByName("New")).thenReturn(false);
        when(projectRepository.save(any(Project.class))).thenReturn(saved);

        Project result = projectService.updateProject("PRJ001", "New", false, "2026", null, null, null);

        assertEquals(saved, result);
        verify(projectRepository).findById("PRJ001");
        verify(projectRepository).existsByName("New");
        verify(projectRepository).save(any(Project.class));
        verify(seoMetadataService).generateAndSaveForProject(saved);
    }

    @Test
    void deleteProject_WhenProjectExists_ShouldDelete() {
        Project project = Project.builder().id("PRJ001").name("Project").build();
        when(projectRepository.findById("PRJ001")).thenReturn(Optional.of(project));

        projectService.deleteProject("PRJ001");

        verify(projectRepository).findById("PRJ001");
        verify(seoMetadataService).deleteByEntity(SeoEntityType.PROJECT, "PRJ001");
        verify(projectRepository).delete(project);
    }
}
