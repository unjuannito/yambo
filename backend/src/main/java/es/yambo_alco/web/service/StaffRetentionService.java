package es.yambo_alco.web.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * The staff data of someone who leaves the team is kept (hidden) in case they come back,
 * but not forever: it is purged once it has been inactive for the retention period.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StaffRetentionService {

    private final UserService userService;

    @Value("${staff.retention.months:12}")
    private long retentionMonths;

    @Scheduled(cron = "0 30 3 * * ?")
    public void purgeInactiveStaff() {
        LocalDateTime cutoff = LocalDateTime.now().minusMonths(retentionMonths);
        int purged = userService.purgeStaffInactiveSince(cutoff);
        if (purged > 0) {
            log.info("Purged {} staff cards inactive for more than {} months", purged, retentionMonths);
        }
    }
}
