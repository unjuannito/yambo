package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.Image;
import es.yambo_alco.web.model.enums.ImageUsageContext;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ImageRepository extends JpaRepository<Image, String> {

    List<Image> findByContextAndReferenceId(ImageUsageContext context, String referenceId);

    List<Image> findByUploadedById(String userId);

    Optional<Image> findByStoredName(String storedName);
}
