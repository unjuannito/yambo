package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.FamilyProduct;
import es.yambo_alco.web.model.enums.FamilyProductStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDateTime;
import java.util.List;

public interface FamilyProductRepository
        extends JpaRepository<FamilyProduct, String>, JpaSpecificationExecutor<FamilyProduct> {

    boolean existsByName(String name);

    List<FamilyProduct> findByStatusAndEndTmsBefore(FamilyProductStatus status, LocalDateTime dateTime);
}
