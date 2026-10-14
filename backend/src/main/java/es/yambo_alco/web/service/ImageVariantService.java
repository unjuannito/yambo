package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.ResourceNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

/**
 * Resized WebP copies of uploaded images, made the first time each size is requested and
 * kept on disk next to the originals ({@code uploads/.variants/{width}/{name}.webp}).
 *
 * <p>The conversion is delegated to libvips ({@code vipsthumbnail}): it honours the EXIF
 * orientation of phone photos and streams the image instead of decoding it into the JVM heap.
 * When the tool is missing (local development, tests) or the file is not a raster image,
 * no variant is produced and callers fall back to the original.
 */
@Service
@Slf4j
public class ImageVariantService {

    /** Closed list: an open width would let anyone fill the disk with variants. */
    public static final List<Integer> WIDTHS = List.of(160, 320, 480, 800, 1200, 1600);

    private static final Set<String> CONVERTIBLE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");
    private static final int QUALITY = 80;
    private static final long TIMEOUT_SECONDS = 30;

    private final FileStorageService fileStorageService;
    private final String command;

    /** Conversions are CPU-bound; two at a time keeps the API responsive on a small node. */
    private final Semaphore conversions = new Semaphore(2);
    private final ConcurrentHashMap<Path, Object> locks = new ConcurrentHashMap<>();
    private volatile boolean toolMissing = false;

    public ImageVariantService(FileStorageService fileStorageService,
                               @Value("${image.variants.command:vipsthumbnail}") String command) {
        this.fileStorageService = fileStorageService;
        this.command = command;
    }

    /**
     * The WebP variant of {@code storedName} at {@code width}, creating it if needed.
     * Empty when the image cannot be converted here; the caller should serve the original.
     *
     * @throws ResourceNotFoundException if the width is not one of {@link #WIDTHS} or the file does not exist
     */
    public Optional<Path> variant(String storedName, int width) {
        if (!WIDTHS.contains(width)) {
            throw new ResourceNotFoundException("Unsupported image width: " + width);
        }
        Path original = fileStorageService.getFilePath(storedName);
        if (toolMissing || !isConvertible(storedName)) {
            return Optional.empty();
        }

        Path target = fileStorageService.variantPath(storedName, width);
        if (Files.exists(target)) {
            return Optional.of(target);
        }

        Object lock = locks.computeIfAbsent(target, p -> new Object());
        try {
            synchronized (lock) {
                if (Files.exists(target) || convert(original, target, width)) {
                    return Optional.of(target);
                }
                return Optional.empty();
            }
        } finally {
            locks.remove(target);
        }
    }

    private boolean isConvertible(String storedName) {
        int dot = storedName.lastIndexOf('.');
        return dot >= 0 && CONVERTIBLE_EXTENSIONS.contains(storedName.substring(dot + 1).toLowerCase(Locale.ROOT));
    }

    private boolean convert(Path original, Path target, int width) {
        Path temp = null;
        boolean acquired = false;
        try {
            acquired = conversions.tryAcquire(TIMEOUT_SECONDS, TimeUnit.SECONDS);
            if (!acquired) {
                log.warn("Image variant queue is busy, serving the original of {}", original.getFileName());
                return false;
            }
            Files.createDirectories(target.getParent());
            // Written to a temp file and moved into place, so a half-written variant is never served
            temp = Files.createTempFile(target.getParent(), "tmp-", ".webp");

            Process process = new ProcessBuilder(
                    command,
                    original.toString(),
                    // "NNNx>": fit to that width, never enlarge
                    "--size", width + "x>",
                    "-o", temp + "[Q=" + QUALITY + ",strip]")
                    .redirectErrorStream(true)
                    .redirectOutput(ProcessBuilder.Redirect.DISCARD)
                    .start();

            if (!process.waitFor(TIMEOUT_SECONDS, TimeUnit.SECONDS)) {
                process.destroyForcibly();
                log.warn("Timed out converting {} to {}px", original.getFileName(), width);
                return false;
            }
            if (process.exitValue() != 0 || Files.size(temp) == 0) {
                log.warn("Could not convert {} to {}px (exit code {})", original.getFileName(), width, process.exitValue());
                return false;
            }
            Files.move(temp, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
            return true;
        } catch (IOException e) {
            // ProcessBuilder.start() fails this way when the binary is not installed
            if (!toolMissing) {
                toolMissing = true;
                log.warn("'{}' is not available: images will be served at their original size ({})", command, e.getMessage());
            }
            return false;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        } finally {
            if (acquired) {
                conversions.release();
            }
            deleteQuietly(temp);
        }
    }

    private void deleteQuietly(Path path) {
        if (path == null) {
            return;
        }
        try {
            Files.deleteIfExists(path);
        } catch (IOException ignored) {
            // A stray temp file is harmless
        }
    }
}
