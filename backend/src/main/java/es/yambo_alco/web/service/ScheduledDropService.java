package es.yambo_alco.web.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduledDropService {

    private final FamilyProductService familyProductService;

    /**
     * Runs every 5 minutes to close drops whose endTms has passed.
     * Only transitions drops that are still in OPEN status to ORDER_CLOSED.
     */
    @Scheduled(fixedRate = 300000) // every 5 minutes
    public void closeExpiredDrops() {
        log.debug("Checking for expired drops to close...");
        try {
            familyProductService.closeExpiredDrops();
        } catch (Exception e) {
            log.error("Error closing expired drops", e);
        }
    }
}
