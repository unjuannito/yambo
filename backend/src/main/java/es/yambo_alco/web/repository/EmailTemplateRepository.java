package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.EmailTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmailTemplateRepository extends JpaRepository<EmailTemplate, String> {

    Optional<EmailTemplate> findByKey(String key);

    List<EmailTemplate> findAllByOrderByKeyAsc();

    boolean existsByKey(String key);
}
