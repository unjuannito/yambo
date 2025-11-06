package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.Profile;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProfileRepository extends JpaRepository<Profile, String> {
    Optional<Profile> findById(String id);
}
