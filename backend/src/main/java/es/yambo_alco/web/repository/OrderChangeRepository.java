package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.OrderChange;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface OrderChangeRepository extends JpaRepository<OrderChange, UUID> {

    List<OrderChange> findByOrderIdOrderByChangedAtDesc(String orderId);

    List<OrderChange> findByOrderProductIdOrderByChangedAtDesc(UUID orderProductId);
}
