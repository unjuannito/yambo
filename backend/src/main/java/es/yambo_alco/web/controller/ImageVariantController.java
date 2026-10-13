package es.yambo_alco.web.controller;

import es.yambo_alco.web.service.ImageVariantService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

/**
 * Serves uploaded images resized for where they are shown:
 * {@code /uploads/_w/480/foto_a7bx3k9q.jpg} is that photo as a 480px-wide WebP.
 */
@RestController
@RequiredArgsConstructor
public class ImageVariantController {

    private static final MediaType WEBP = MediaType.parseMediaType("image/webp");

    private final ImageVariantService imageVariantService;

    @GetMapping("/uploads/_w/{width}/{storedName:.+}")
    public ResponseEntity<Resource> getVariant(@PathVariable int width, @PathVariable String storedName) {
        Optional<Path> variant = imageVariantService.variant(storedName, width);

        if (variant.isEmpty()) {
            // Not convertible here (SVG, GIF, no libvips): send the browser to the original.
            // Relative, so it works both behind /api and behind the nginx /uploads proxy.
            return ResponseEntity.status(HttpStatus.FOUND)
                    .header(HttpHeaders.LOCATION, "../../" + UriUtils.encodePathSegment(storedName, StandardCharsets.UTF_8))
                    .build();
        }

        // A stored name never changes content (uploads get a random suffix), so variants are immutable
        return ResponseEntity.ok()
                .contentType(WEBP)
                .cacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable())
                .body(new FileSystemResource(variant.get()));
    }
}
