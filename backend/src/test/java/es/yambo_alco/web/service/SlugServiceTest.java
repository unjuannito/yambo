package es.yambo_alco.web.service;

import es.yambo_alco.web.model.Activity;
import es.yambo_alco.web.model.Project;
import es.yambo_alco.web.repository.ActivityRepository;
import es.yambo_alco.web.repository.ProjectRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SlugServiceTest {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private ActivityRepository activityRepository;

    @InjectMocks
    private SlugService slugService;

    @Test
    void forProject_ShouldUseTheName() {
        assertThat(slugService.forProject("Barrio Jóven")).isEqualTo("barrio-joven");
    }

    @Test
    void forProject_ShouldNumberTheSlugWhenTaken() {
        when(projectRepository.existsBySlug("jambo")).thenReturn(true);
        when(projectRepository.existsBySlug("jambo-2")).thenReturn(true);

        assertThat(slugService.forProject("Jambo")).isEqualTo("jambo-3");
    }

    @Test
    void forActivity_ShouldAppendTheYear() {
        String slug = slugService.forActivity("Campamento de verano", LocalDateTime.of(2026, 7, 1, 10, 0));

        assertThat(slug).isEqualTo("campamento-de-verano-2026");
    }

    @Test
    void forActivity_ShouldNotRepeatAYearAlreadyInTheName() {
        String slug = slugService.forActivity("Campamento 2026", LocalDateTime.of(2026, 7, 1, 10, 0));

        assertThat(slug).isEqualTo("campamento-2026");
    }

    @Test
    void forActivity_ShouldWorkWithoutDateAndNumberRepeats() {
        when(activityRepository.existsBySlug("taller")).thenReturn(true);

        assertThat(slugService.forActivity("Taller", null)).isEqualTo("taller-2");
    }

    @Test
    void backfill_ShouldGiveASlugToRowsThatLackOne() {
        Project project = Project.builder().id("PRJ001").name("Jambo").build();
        Activity activity = Activity.builder().id("ACT001").name("Salida")
                .date(LocalDateTime.of(2025, 3, 1, 10, 0)).build();
        when(projectRepository.findBySlugIsNull(any(Sort.class))).thenReturn(List.of(project));
        when(activityRepository.findBySlugIsNull(any(Sort.class))).thenReturn(List.of(activity));

        slugService.backfill();

        assertThat(project.getSlug()).isEqualTo("jambo");
        assertThat(activity.getSlug()).isEqualTo("salida-2025");
        verify(projectRepository).saveAndFlush(project);
        verify(activityRepository).saveAndFlush(activity);
    }

    @Test
    void backfill_ShouldDoNothingOnceEverythingHasASlug() {
        when(projectRepository.findBySlugIsNull(any(Sort.class))).thenReturn(List.of());
        when(activityRepository.findBySlugIsNull(any(Sort.class))).thenReturn(List.of());

        slugService.backfill();

        verify(projectRepository, never()).saveAndFlush(any());
        verify(activityRepository, never()).saveAndFlush(any());
    }
}
