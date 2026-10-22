package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.ActivityWaitlist;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ActivityWaitlistRepository extends JpaRepository<ActivityWaitlist, Long> {

    List<ActivityWaitlist> findByActivityIdAndNotifiedAtIsNull(String activityId);

    boolean existsByActivityIdAndEmailIgnoreCase(String activityId, String email);

    long countByActivityId(String activityId);
}
