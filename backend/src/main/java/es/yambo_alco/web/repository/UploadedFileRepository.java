package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.UploadedFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UploadedFileRepository extends JpaRepository<UploadedFile, String> {

    List<UploadedFile> findByUploadedById(String userId);

    Optional<UploadedFile> findByStoredName(String storedName);
}
