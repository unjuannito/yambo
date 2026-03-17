package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.Activity;
import es.yambo_alco.web.model.Project;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.ActivityStatus;
import es.yambo_alco.web.repository.ActivityRepository;
import es.yambo_alco.web.repository.ProjectRepository;
import es.yambo_alco.web.repository.UserRepository;
import es.yambo_alco.web.repository.spec.ActivitySpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ActivityService {

    private final ActivityRepository activityRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public Activity getActivityById(@NonNull String id) {
        return activityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Activity not found"));
    }

    public List<Activity> getPublicActivities() {
        return activityRepository.findByIsPublicTrueOrderByDateAsc();
    }

    public Page<Activity> listActivities(String name, ActivityStatus status, Boolean isPublic,
                                           String projectId, String managerId,
                                           LocalDateTime startDate, LocalDateTime endDate,
                                           @NonNull Pageable pageable) {
        Specification<Activity> spec = Specification.where(null);
        spec = spec.and(ActivitySpecifications.nameContains(name));
        spec = spec.and(ActivitySpecifications.statusEquals(status));
        spec = spec.and(ActivitySpecifications.isPublicEquals(isPublic));
        spec = spec.and(ActivitySpecifications.projectIdEquals(projectId));
        spec = spec.and(ActivitySpecifications.managerIdEquals(managerId));
        if (startDate != null || endDate != null) {
            spec = spec.and(ActivitySpecifications.dateBetween(startDate, endDate));
        }
        return activityRepository.findAll(spec, pageable);
    }

    public Activity createActivity(@NonNull String name, String description, LocalDateTime date,
                                   LocalDateTime endDate, ActivityStatus status, Boolean isPublic,
                                   @NonNull String projectId, String managerId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        User manager = null;
        if (managerId != null) {
            manager = userRepository.findById(managerId)
                    .orElseThrow(() -> new ResourceNotFoundException("Manager user not found"));
            validateManagerBelongsToProject(manager, projectId);
        }

        Activity activity = Activity.builder()
                .name(name)
                .description(description)
                .date(date)
                .endDate(endDate)
                .status(status)
                .isPublic(isPublic != null ? isPublic : false)
                .project(project)
                .manager(manager)
                .build();

        return activityRepository.save(activity);
    }

    public Activity updateActivity(@NonNull String id, String name, String description, LocalDateTime date,
                                   LocalDateTime endDate, ActivityStatus status, Boolean isPublic,
                                   String projectId, String managerId) {
        Activity activity = getActivityById(id);

        if (name != null && !name.trim().isEmpty()) {
            activity.setName(name.trim());
        }
        if (description != null) {
            activity.setDescription(description);
        }
        if (date != null) {
            activity.setDate(date);
        }
        if (endDate != null) {
            activity.setEndDate(endDate);
        }
        if (status != null) {
            activity.setStatus(status);
        }
        if (isPublic != null) {
            activity.setPublic(isPublic);
        }
        if (projectId != null) {
            Project project = projectRepository.findById(projectId)
                    .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
            activity.setProject(project);
        }
        if (managerId != null) {
            if (managerId.isEmpty()) {
                activity.setManager(null);
            } else {
                User manager = userRepository.findById(managerId)
                        .orElseThrow(() -> new ResourceNotFoundException("Manager user not found"));
                String effectiveProjectId = projectId != null ? projectId : activity.getProject().getId();
                validateManagerBelongsToProject(manager, effectiveProjectId);
                activity.setManager(manager);
            }
        }

        return activityRepository.save(activity);
    }

    public List<User> getStaffByProject(@NonNull String projectId) {
        if (!projectRepository.existsById(projectId)) {
            throw new ResourceNotFoundException("Project not found");
        }
        return userRepository.findStaffByProjectId(projectId);
    }

    public void deleteActivity(@NonNull String id) {
        Activity activity = getActivityById(id);
        activityRepository.delete(activity);
    }

    private void validateManagerBelongsToProject(User manager, String projectId) {
        List<User> projectStaff = userRepository.findStaffByProjectId(projectId);
        boolean belongs = projectStaff.stream().anyMatch(m -> m.getId().equals(manager.getId()));
        if (!belongs) {
            throw new BadRequestException("El responsable seleccionado no pertenece al equipo del proyecto");
        }
    }
}
