package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.LegalPage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LegalPageRepository extends JpaRepository<LegalPage, String> {

    List<LegalPage> findByPublishedTrueOrderByType();

    Optional<LegalPage> findByIdAndPublishedTrue(String id);

    List<LegalPage> findAllByOrderByType();
}
