package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.Staff;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface StaffRepository extends JpaRepository<Staff, String> {

    /** Staff data of users who stopped being staff before the given moment. */
    List<Staff> findByInactiveSinceBefore(LocalDateTime cutoff);
}
