package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.ForbiddenException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.UploadedFile;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.UploadedFileRepository;
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
public class UploadedFileService {

    private final UploadedFileRepository uploadedFileRepository;
    private final FileStorageService fileStorageService;
    private final AuthService authService;

    private static final String UPLOADS_PREFIX = "/uploads/";

    /**
     * Upload a file and track it in the database.
     */
    @Transactional
    public UploadedFile upload(@NonNull MultipartFile file) {
        User currentUser = authService.getCurrentUser(true);

        // Store the file on disk
        String storedName = fileStorageService.store(file);
        String url = UPLOADS_PREFIX + storedName;

        // Create and save the file record
        UploadedFile uploadedFile = UploadedFile.builder()
                .originalName(file.getOriginalFilename())
                .storedName(storedName)
                .contentType(file.getContentType())
                .size(file.getSize())
                .url(url)
                .uploadedBy(currentUser)
                .build();

        UploadedFile saved = uploadedFileRepository.save(uploadedFile);
        log.info("File uploaded: id={} originalName={} by={}",
                saved.getId(), saved.getOriginalName(), currentUser.getId());

        return saved;
    }

    /**
     * Get a file record by its ID.
     */
    public UploadedFile getById(@NonNull String fileId) {
        return uploadedFileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));
    }

    /**
     * List all files uploaded by the current user.
     */
    public List<UploadedFile> listMyFiles() {
        User currentUser = authService.getCurrentUser(true);
        return uploadedFileRepository.findByUploadedById(currentUser.getId());
    }

    /**
     * Delete a file. Only the uploader or an admin can delete.
     */
    @Transactional
    public void delete(@NonNull String fileId) {
        User currentUser = authService.getCurrentUser(true);
        UploadedFile uploadedFile = getById(fileId);

        // Check ownership
        if (!uploadedFile.getUploadedBy().getId().equals(currentUser.getId())) {
            boolean isAdmin = currentUser.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().contains("admin") || a.getAuthority().contains("ADMIN"));
            if (!isAdmin) {
                throw new ForbiddenException("You can only delete your own files");
            }
        }

        deleteFile(uploadedFile);
        uploadedFileRepository.delete(uploadedFile);
        log.info("File deleted: id={} by={}", fileId, currentUser.getId());
    }

    /**
     * Deletes the file behind an "/uploads/..." url if it was uploaded by the given user.
     * Used to clean up replaced or removed staff photos; files uploaded by someone else
     * (which may be in use elsewhere) are left alone.
     */
    @Transactional
    public void deleteOwnedByUrl(String url, @NonNull String ownerId) {
        if (url == null || !url.startsWith(UPLOADS_PREFIX)) {
            return;
        }
        uploadedFileRepository.findByStoredName(url.substring(UPLOADS_PREFIX.length()))
                .filter(file -> file.getUploadedBy() != null && ownerId.equals(file.getUploadedBy().getId()))
                .ifPresent(file -> {
                    deleteFile(file);
                    uploadedFileRepository.delete(file);
                    log.info("File deleted: id={} (no longer used by its owner {})", file.getId(), ownerId);
                });
    }

    private void deleteFile(UploadedFile uploadedFile) {
        try {
            fileStorageService.delete(uploadedFile.getStoredName());
        } catch (Exception e) {
            log.error("Failed to delete file: {}", uploadedFile.getStoredName(), e);
        }
    }
}
