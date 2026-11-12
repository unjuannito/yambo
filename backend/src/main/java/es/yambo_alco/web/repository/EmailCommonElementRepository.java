package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.EmailCommonElement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmailCommonElementRepository extends JpaRepository<EmailCommonElement, String> {

    Optional<EmailCommonElement> findByKey(String key);

    List<EmailCommonElement> findAllByOrderByKeyAsc();
}
