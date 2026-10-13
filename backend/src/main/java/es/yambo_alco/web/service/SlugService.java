package es.yambo_alco.web.service;

import es.yambo_alco.web.model.Activity;
import es.yambo_alco.web.model.Project;
import es.yambo_alco.web.repository.ActivityRepository;
import es.yambo_alco.web.repository.ProjectRepository;
import es.yambo_alco.web.util.Slugs;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.function.Predicate;

/**
 * Slugs for the public URLs of projects and activities ({@code /proyectos/jambo}).
 * A slug is assigned once and never follows a rename, so published links keep working.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SlugService {

    private final ProjectRepository projectRepository;
    private final ActivityRepository activityRepository;

    public String forProject(String name) {
        return unique(Slugs.slugify(name, "proyecto"), projectRepository::existsBySlug);
    }

    /**
     * Activities repeat every year ("Campamento de verano"), so the year is part of the slug
     * unless the name already carries it.
     */
    public String forActivity(String name, LocalDateTime date) {
        String base = Slugs.slugify(name, "actividad");
        if (date != null) {
            String year = String.valueOf(date.getYear());
            if (!base.contains(year)) {
                base = base + "-" + year;
            }
        }
        return unique(base, activityRepository::existsBySlug);
    }

    private String unique(String base, Predicate<String> taken) {
        String candidate = base;
        for (int n = 2; taken.test(candidate); n++) {
            candidate = base + "-" + n;
        }
        return candidate;
    }

    /** Gives a slug to the rows created before slugs existed. Does nothing once they all have one. */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void backfill() {
        int filled = 0;
        for (Project project : projectRepository.findBySlugIsNull(Sort.by("name"))) {
            project.setSlug(forProject(project.getName()));
            projectRepository.saveAndFlush(project);
            filled++;
        }
        // Oldest first, so the earliest edition of a repeated activity keeps the plain slug
        for (Activity activity : activityRepository.findBySlugIsNull(Sort.by("date", "name"))) {
            activity.setSlug(forActivity(activity.getName(), activity.getDate()));
            activityRepository.saveAndFlush(activity);
            filled++;
        }
        if (filled > 0) {
            log.info("Assigned a slug to {} existing projects/activities", filled);
        }
    }
}
