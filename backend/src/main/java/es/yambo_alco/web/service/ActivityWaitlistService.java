package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.Activity;
import es.yambo_alco.web.model.ActivityWaitlist;
import es.yambo_alco.web.model.enums.ActivityStatus;
import es.yambo_alco.web.repository.ActivityRepository;
import es.yambo_alco.web.repository.ActivityWaitlistRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ActivityWaitlistService {

    private static final Logger log = LoggerFactory.getLogger(ActivityWaitlistService.class);

    private final ActivityWaitlistRepository activityWaitlistRepository;
    private final ActivityRepository activityRepository;
    private final MailService mailService;
    private final SettingsService settingsService;

    public long getCount(String activityId) {
        return activityWaitlistRepository.countByActivityId(activityId);
    }

    @Transactional
    public void register(String activityId, String email) {
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new ResourceNotFoundException("Activity not found"));

        if (activity.getStatus() != ActivityStatus.PLANNED) {
            throw new BadRequestException("Solo puedes registrarte en actividades planificadas");
        }

        String normalizedEmail = email.toLowerCase().trim();

        if (activityWaitlistRepository.existsByActivityIdAndEmailIgnoreCase(activityId, normalizedEmail)) {
            throw new BadRequestException("Ya estás registrado para recibir notificaciones de esta actividad");
        }

        ActivityWaitlist entry = ActivityWaitlist.builder()
                .activityId(activityId)
                .email(normalizedEmail)
                .createdAt(LocalDateTime.now())
                .build();

        activityWaitlistRepository.save(entry);
        log.info("Registered {} for waitlist of activity {}", normalizedEmail, activityId);
    }

    @Transactional
    public void notifyAll(String activityId) {
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new ResourceNotFoundException("Activity not found"));

        List<ActivityWaitlist> pending = activityWaitlistRepository
                .findByActivityIdAndNotifiedAtIsNull(activityId);

        if (pending.isEmpty()) {
            log.info("No pending waitlist entries for activity {}", activityId);
            return;
        }

        String activityUrl = settingsService.getDomain() + "/actividades/" + activityId;
        String activityName = activity.getName();

        for (ActivityWaitlist entry : pending) {
            try {
                mailService.sendActivityOpenRegistration(entry.getEmail(), activityName, activityUrl);
                entry.setNotifiedAt(LocalDateTime.now());
                log.info("Notified {} about activity {} opening", entry.getEmail(), activityId);
            } catch (Exception e) {
                log.error("Failed to notify {} about activity {}: {}", entry.getEmail(), activityId, e.getMessage());
            }
        }

        activityWaitlistRepository.saveAll(pending);
    }
}
