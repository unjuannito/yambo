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
import java.security.SecureRandom;

@Service
@Slf4j
public class FileStorageService {

    private static final String SALT_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
    private static final int SALT_LENGTH = 8;
    private static final int MAX_BASE_NAME_LENGTH = 50;
    private static final SecureRandom RANDOM = new SecureRandom();

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
     * Store a file on disk using a sanitized version of the original filename
     * with a random salt appended for uniqueness.
     * Example: "My Vacation Photo (2).jpeg" → "my-vacation-photo-2_a7bx3k9q.jpeg"
     */
    public String store(MultipartFile file) {
        validateFile(file);

        String extension = getExtension(file.getOriginalFilename());
        String baseName = getBaseName(file.getOriginalFilename());
        String sanitized = sanitize(baseName);
        String storedName = generateUniqueStoredName(sanitized, extension);
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
                deleteVariants(storedName);
                log.info("Deleted file: {}", storedName);
            } else {
                log.warn("File not found for deletion: {}", storedName);
            }
        } catch (IOException e) {
            log.error("Failed to delete file: {}", storedName, e);
        }
    }

    /** Folder, inside the uploads directory, holding the resized copies of images. */
    static final String VARIANTS_DIR = ".variants";

    /**
     * Where the resized WebP copy of an image lives. The file may not exist yet.
     */
    public Path variantPath(String storedName, int width) {
        Path path = uploadPath.resolve(VARIANTS_DIR).resolve(String.valueOf(width)).resolve(storedName + ".webp").normalize();
        if (!path.startsWith(uploadPath.resolve(VARIANTS_DIR))) {
            throw new BadRequestException("Invalid file path");
        }
        return path;
    }

    /** Removes every resized copy of a file; they are worthless without the original. */
    private void deleteVariants(String storedName) {
        Path variantsRoot = uploadPath.resolve(VARIANTS_DIR);
        if (!Files.isDirectory(variantsRoot)) {
            return;
        }
        try (var widths = Files.list(variantsRoot)) {
            for (Path widthDir : widths.toList()) {
                Files.deleteIfExists(widthDir.resolve(storedName + ".webp"));
            }
        } catch (IOException e) {
            log.warn("Failed to delete image variants of {}", storedName, e);
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
    }

    /**
     * Sanitize a filename base: lowercase, replace non-alphanumeric with dashes,
     * collapse consecutive dashes, trim dashes from edges, truncate.
     */
    String sanitize(String name) {
        if (name == null || name.isBlank()) {
            return "file";
        }
        String result = name.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")  // replace non-alphanumeric with dash
                .replaceAll("-{2,}", "-")        // collapse consecutive dashes
                .replaceAll("^-|-$", "");        // trim leading/trailing dashes

        if (result.isEmpty()) {
            return "file";
        }
        if (result.length() > MAX_BASE_NAME_LENGTH) {
            result = result.substring(0, MAX_BASE_NAME_LENGTH);
            // Don't end on a dash after truncation
            result = result.replaceAll("-$", "");
        }
        return result;
    }

    private String generateSalt() {
        StringBuilder sb = new StringBuilder(SALT_LENGTH);
        for (int i = 0; i < SALT_LENGTH; i++) {
            sb.append(SALT_CHARS.charAt(RANDOM.nextInt(SALT_CHARS.length())));
        }
        return sb.toString();
    }

    /**
     * Generate a unique stored name, re-generating the salt if a collision occurs.
     */
    private String generateUniqueStoredName(String sanitizedBase, String extension) {
        for (int attempt = 0; attempt < 10; attempt++) {
            String candidate = sanitizedBase + "_" + generateSalt() + extension;
            if (!Files.exists(uploadPath.resolve(candidate))) {
                return candidate;
            }
            log.debug("Stored name collision on attempt {}: {}", attempt + 1, candidate);
        }
        // Extremely unlikely fallback
        throw new RuntimeException("Could not generate unique filename after 10 attempts");
    }

    private String getBaseName(String filename) {
        if (filename == null || !filename.contains(".")) {
            return filename != null ? filename : "";
        }
        return filename.substring(0, filename.lastIndexOf("."));
    }

    private String getExtension(String filename) {
        if (filename != null && filename.contains(".")) {
            return filename.substring(filename.lastIndexOf("."));
        }
        return "";
    }
}
