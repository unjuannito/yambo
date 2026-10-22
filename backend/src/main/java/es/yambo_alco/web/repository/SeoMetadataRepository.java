package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.SeoMetadata;
import es.yambo_alco.web.model.enums.SeoEntityType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SeoMetadataRepository extends JpaRepository<SeoMetadata, String> {

    Optional<SeoMetadata> findByEntityTypeAndEntityId(SeoEntityType entityType, String entityId);

    void deleteByEntityTypeAndEntityId(SeoEntityType entityType, String entityId);

    Page<SeoMetadata> findByEntityType(SeoEntityType entityType, Pageable pageable);

    List<SeoMetadata> findByEntityType(SeoEntityType entityType);
}
