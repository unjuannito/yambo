package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.Settings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SettingsRepository extends JpaRepository<Settings, String> {
    Optional<Settings> findByKey(String key);
    List<Settings> findByCategory(String category);
}
