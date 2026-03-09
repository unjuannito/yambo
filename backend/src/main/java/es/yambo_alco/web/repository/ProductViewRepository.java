package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.ProductView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface ProductViewRepository extends JpaRepository<ProductView, UUID> {

    @Query("SELECT COUNT(pv) FROM ProductView pv WHERE pv.viewedAt BETWEEN :start AND :end")
    long countByViewedAtBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(DISTINCT pv.productId) FROM ProductView pv WHERE pv.viewedAt BETWEEN :start AND :end")
    long countDistinctProductsBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT pv.productId, COUNT(pv) FROM ProductView pv " +
           "WHERE pv.viewedAt BETWEEN :start AND :end " +
           "GROUP BY pv.productId " +
           "ORDER BY COUNT(pv) DESC")
    List<Object[]> countViewsByProduct(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    boolean existsByProductIdAndUserIdAndViewedAtAfter(String productId, String userId, LocalDateTime after);

    boolean existsByProductIdAndSessionIdAndViewedAtAfter(String productId, String sessionId, LocalDateTime after);
}
