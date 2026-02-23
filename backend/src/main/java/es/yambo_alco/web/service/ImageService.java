package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.ForbiddenException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.Image;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.ImageUsageContext;
import es.yambo_alco.web.repository.ImageRepository;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImageService {

    private final ImageRepository imageRepository;
    private final FileStorageService fileStorageService;
    private final AuthService authService;

    /**
     * Upload an image, track its usage context and reference.
     * If the context is set to replacePrevious, any existing images for the
     * same context+reference are automatically deleted.
     */
    @Transactional
    public Image upload(@NonNull MultipartFile file,
                        @NonNull ImageUsageContext context,
                        String referenceId) {
        User currentUser = authService.getCurrentUser(true);

        // If this context replaces previous images, delete them first
        if (context.isReplacePrevious() && referenceId != null) {
            List<Image> existing = imageRepository.findByContextAndReferenceId(context, referenceId);
            for (Image old : existing) {
                deleteImageFile(old);
                imageRepository.delete(old);
                log.info("Replaced previous image {} for context={} referenceId={}",
                        old.getId(), context, referenceId);
            }
        }

        // Store the file on disk
        String storedName = fileStorageService.store(file);
        String url = "/uploads/" + storedName;

        // Create and save the image record
        Image image = Image.builder()
                .originalName(file.getOriginalFilename())
                .storedName(storedName)
                .contentType(file.getContentType())
                .size(file.getSize())
                .url(url)
                .context(context)
                .referenceId(referenceId)
                .uploadedBy(currentUser)
                .build();

        Image saved = imageRepository.save(image);
        log.info("Image uploaded: id={} context={} referenceId={} by={}",
                saved.getId(), context, referenceId, currentUser.getId());

        return saved;
    }

    /**
     * Get an image by its ID.
     */
    public Image getById(@NonNull String imageId) {
        return imageRepository.findById(imageId)
                .orElseThrow(() -> new ResourceNotFoundException("Image not found"));
    }

    /**
     * List all images for a given context and reference.
     */
    public List<Image> listByContextAndReference(@NonNull ImageUsageContext context, String referenceId) {
        return imageRepository.findByContextAndReferenceId(context, referenceId);
    }

    /**
     * List all images uploaded by the current user.
     */
    public List<Image> listMyImages() {
        User currentUser = authService.getCurrentUser(true);
        return imageRepository.findByUploadedById(currentUser.getId());
    }

    /**
     * Delete an image. Only the uploader or an admin can delete.
     */
    @Transactional
    public void delete(@NonNull String imageId) {
        User currentUser = authService.getCurrentUser(true);
        Image image = getById(imageId);

        // Check ownership
        if (!image.getUploadedBy().getId().equals(currentUser.getId())) {
            // Allow admins (users with any permission that includes 'delete' on images, or just check profile)
            boolean isAdmin = currentUser.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().contains("admin") || a.getAuthority().contains("ADMIN"));
            if (!isAdmin) {
                throw new ForbiddenException("You can only delete your own images");
            }
        }

        deleteImageFile(image);
        imageRepository.delete(image);
        log.info("Image deleted: id={} by={}", imageId, currentUser.getId());
    }

    private void deleteImageFile(Image image) {
        try {
            fileStorageService.delete(image.getStoredName());
        } catch (Exception e) {
            log.error("Failed to delete image file: {}", image.getStoredName(), e);
        }
    }
}
