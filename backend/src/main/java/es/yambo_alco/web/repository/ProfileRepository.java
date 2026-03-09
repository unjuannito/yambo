package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.Profile;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Repository;

@Repository
public interface ProfileRepository extends JpaRepository<Profile, String> {

    @EntityGraph(attributePaths = {"permissions"})
    Optional<Profile> findById(@NonNull String id);

    @Override
    @EntityGraph(attributePaths = {"permissions"})
    @NonNull
    List<Profile> findAll();
}
