package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.Issue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IssueRepository extends JpaRepository<Issue, String>, JpaSpecificationExecutor<Issue> {

    @Query("SELECT i FROM Issue i JOIN i.orderProducts op WHERE op.id = :orderedProductId")
    Optional<Issue> findByOrderedProductId(@Param("orderedProductId") UUID orderedProductId);

    @Query("SELECT DISTINCT i FROM Issue i JOIN i.orderProducts op WHERE op.id = :orderedProductId")
    List<Issue> findAllByOrderedProductId(@Param("orderedProductId") UUID orderedProductId);

    @Query("SELECT DISTINCT i FROM Issue i JOIN i.orderProducts op WHERE op.orderId = :orderId")
    List<Issue> findByOrderId(@Param("orderId") String orderId);

    @Query("""
            SELECT op
            FROM Issue i
            JOIN i.orderProducts op
            LEFT JOIN FETCH op.product p
            LEFT JOIN FETCH p.familyProduct
            WHERE i.id = :issueId
            """)
    List<es.yambo_alco.web.model.OrderProduct> findOrderProductsByIssueId(@Param("issueId") String issueId);
}
