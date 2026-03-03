package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.OrderStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface OrderStatusHistoryRepository extends JpaRepository<OrderStatusHistory, UUID> {

    List<OrderStatusHistory> findByOrderIdOrderByChangedAtDesc(String orderId);

    @Query("SELECT h.toStatus, COUNT(h) FROM OrderStatusHistory h " +
           "WHERE h.changedAt BETWEEN :start AND :end " +
           "GROUP BY h.toStatus")
    List<Object[]> countTransitionsByStatus(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
