package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.FamilyProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface FamilyProductRepository extends JpaRepository<FamilyProduct, String>, JpaSpecificationExecutor<FamilyProduct> {
    
    boolean existsByName(String name);
}
