package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.OrderProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface OrderProductRepository extends JpaRepository<OrderProduct, String>, JpaSpecificationExecutor<OrderProduct> {
    
    void deleteByOrderId(String orderId);
}
