package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.FamilyProductWatcher;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FamilyProductWatcherRepository extends JpaRepository<FamilyProductWatcher, UUID> {

    List<FamilyProductWatcher> findByFamilyProductId(String familyProductId);

    Optional<FamilyProductWatcher> findByFamilyProductIdAndEmail(String familyProductId, String email);

    void deleteByFamilyProductIdAndEmail(String familyProductId, String email);

    boolean existsByFamilyProductIdAndEmail(String familyProductId, String email);
}
