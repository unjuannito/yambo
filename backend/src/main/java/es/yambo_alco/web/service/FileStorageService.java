package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
public class FileStorageService {

    private final SettingsService settingsService;

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    private Path uploadPath;

    public FileStorageService(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @PostConstruct
    public void init() {
        uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(uploadPath);
            log.info("Upload directory initialized at: {}", uploadPath);
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory: " + uploadPath, e);
        }
    }

    /**
     * Store a file on disk and return the generated unique filename.
     */
    public String store(MultipartFile file) {
        validateFile(file);

        String extension = getExtension(file.getOriginalFilename());
        String storedName = UUID.randomUUID() + extension;
        Path targetPath = uploadPath.resolve(storedName);

        try {
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            log.info("Stored file: {} -> {}", file.getOriginalFilename(), storedName);
            return storedName;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file: " + file.getOriginalFilename(), e);
        }
    }

    /**
     * Delete a file from disk by its stored name.
     */
    public void delete(String storedName) {
        Path filePath = uploadPath.resolve(storedName).normalize();

        // Prevent path traversal
        if (!filePath.startsWith(uploadPath)) {
            throw new BadRequestException("Invalid file path");
        }

        try {
            if (Files.exists(filePath)) {
                Files.delete(filePath);
                log.info("Deleted file: {}", storedName);
            } else {
                log.warn("File not found for deletion: {}", storedName);
            }
        } catch (IOException e) {
            log.error("Failed to delete file: {}", storedName, e);
        }
    }

    /**
     * Get the absolute path to a stored file.
     */
    public Path getFilePath(String storedName) {
        Path filePath = uploadPath.resolve(storedName).normalize();
        if (!filePath.startsWith(uploadPath)) {
            throw new BadRequestException("Invalid file path");
        }
        if (!Files.exists(filePath)) {
            throw new ResourceNotFoundException("File not found: " + storedName);
        }
        return filePath;
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is empty");
        }

        long maxSizeBytes = (long) settingsService.getUploadMaxFileSizeMb() * 1024 * 1024;
        if (file.getSize() > maxSizeBytes) {
            throw new BadRequestException("File size exceeds maximum allowed size of "
                    + settingsService.getUploadMaxFileSizeMb() + "MB");
        }

        String contentType = file.getContentType();
        Set<String> allowedTypes = settingsService.getUploadAllowedTypes();
        if (contentType == null || !allowedTypes.contains(contentType)) {
            throw new BadRequestException("File type not allowed. Accepted: " + String.join(", ", allowedTypes));
        }
    }

    private String getExtension(String filename) {
        if (filename != null && filename.contains(".")) {
            return filename.substring(filename.lastIndexOf("."));
        }
        return "";
    }
}
