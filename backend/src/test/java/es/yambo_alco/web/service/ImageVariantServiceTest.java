package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.DisabledOnOs;
import org.junit.jupiter.api.condition.OS;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ImageVariantServiceTest {

    @TempDir
    Path uploads;

    @TempDir
    Path tools;

    private FileStorageService fileStorageService;

    @BeforeEach
    void setup() throws IOException {
        fileStorageService = new FileStorageService(Mockito.mock(SettingsService.class));
        ReflectionTestUtils.setField(fileStorageService, "uploadDir", uploads.toString());
        fileStorageService.init();
        Files.writeString(uploads.resolve("foto_abc12345.jpg"), "original");
    }

    /**
     * Stand-in for vipsthumbnail: copies the input to the output path (minus the
     * "[Q=..]" options) and leaves a line in calls.log, or fails if asked to.
     */
    private String fakeTool(boolean succeeds) throws IOException {
        Path script = tools.resolve(succeeds ? "resize-ok" : "resize-fail");
        Files.writeString(script, """
                #!/bin/sh
                echo "$3" >> "%s/calls.log"
                %s
                cp "$1" "${5%%%%\\[*}"
                """.formatted(tools, succeeds ? "" : "exit 1"));
        Files.setPosixFilePermissions(script, PosixFilePermissions.fromString("rwxr-xr-x"));
        return script.toString();
    }

    private ImageVariantService serviceWith(String command) {
        return new ImageVariantService(fileStorageService, command);
    }

    @Test
    void variant_ShouldRejectWidthsOutsideTheList() {
        ImageVariantService service = serviceWith("unused");

        assertThatThrownBy(() -> service.variant("foto_abc12345.jpg", 481))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void variant_ShouldRejectFilesThatDoNotExist() {
        ImageVariantService service = serviceWith("unused");

        assertThatThrownBy(() -> service.variant("no-existe.jpg", 480))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void variant_ShouldFallBackToTheOriginalForNonRasterFiles() throws IOException {
        Files.writeString(uploads.resolve("logo_abc12345.svg"), "<svg/>");
        Files.writeString(uploads.resolve("baile_abc12345.gif"), "gif");
        ImageVariantService service = serviceWith("unused");

        assertThat(service.variant("logo_abc12345.svg", 480)).isEmpty();
        assertThat(service.variant("baile_abc12345.gif", 480)).isEmpty();
    }

    @Test
    void variant_ShouldFallBackToTheOriginalWhenTheToolIsNotInstalled() {
        ImageVariantService service = serviceWith(tools.resolve("not-installed").toString());

        assertThat(service.variant("foto_abc12345.jpg", 480)).isEmpty();
        // Stays quiet afterwards instead of trying to launch it on every request
        assertThat(service.variant("foto_abc12345.jpg", 800)).isEmpty();
    }

    @Test
    @DisabledOnOs(OS.WINDOWS)
    void variant_ShouldCreateTheVariantOnceAndReuseIt() throws IOException {
        ImageVariantService service = serviceWith(fakeTool(true));

        Optional<Path> first = service.variant("foto_abc12345.jpg", 480);
        Optional<Path> second = service.variant("foto_abc12345.jpg", 480);

        Path expected = uploads.resolve(".variants/480/foto_abc12345.jpg.webp");
        assertThat(first).contains(expected);
        assertThat(second).contains(expected);
        assertThat(expected).hasContent("original");
        // Asked for "fit to 480 wide, never enlarge", and only the first time
        assertThat(Files.readAllLines(tools.resolve("calls.log"))).containsExactly("480x>");
    }

    @Test
    @DisabledOnOs(OS.WINDOWS)
    void variant_ShouldKeepEachWidthSeparately() throws IOException {
        ImageVariantService service = serviceWith(fakeTool(true));

        service.variant("foto_abc12345.jpg", 320);
        service.variant("foto_abc12345.jpg", 1200);

        assertThat(uploads.resolve(".variants/320/foto_abc12345.jpg.webp")).exists();
        assertThat(uploads.resolve(".variants/1200/foto_abc12345.jpg.webp")).exists();
    }

    @Test
    @DisabledOnOs(OS.WINDOWS)
    void variant_ShouldFallBackAndLeaveNoDebrisWhenTheConversionFails() throws IOException {
        ImageVariantService service = serviceWith(fakeTool(false));

        assertThat(service.variant("foto_abc12345.jpg", 480)).isEmpty();

        try (var files = Files.list(uploads.resolve(".variants/480"))) {
            assertThat(files).isEmpty();
        }
    }

    @Test
    @DisabledOnOs(OS.WINDOWS)
    void deletingTheOriginal_ShouldDeleteItsVariants() throws IOException {
        Files.writeString(uploads.resolve("otra_abc12345.jpg"), "otra");
        ImageVariantService service = serviceWith(fakeTool(true));
        service.variant("foto_abc12345.jpg", 320);
        service.variant("foto_abc12345.jpg", 800);
        service.variant("otra_abc12345.jpg", 320);

        fileStorageService.delete("foto_abc12345.jpg");

        assertThat(uploads.resolve(".variants/320/foto_abc12345.jpg.webp")).doesNotExist();
        assertThat(uploads.resolve(".variants/800/foto_abc12345.jpg.webp")).doesNotExist();
        assertThat(uploads.resolve(".variants/320/otra_abc12345.jpg.webp")).exists();
    }

    /** End to end with the real tool; skipped where libvips is not installed. */
    @Test
    void variant_WithLibvips_ShouldProduceANarrowerWebp() throws Exception {
        org.junit.jupiter.api.Assumptions.assumeTrue(isOnPath("vipsthumbnail"), "vipsthumbnail not installed");
        java.awt.image.BufferedImage image = new java.awt.image.BufferedImage(1000, 500, java.awt.image.BufferedImage.TYPE_INT_RGB);
        javax.imageio.ImageIO.write(image, "png", uploads.resolve("grande_abc12345.png").toFile());
        ImageVariantService service = serviceWith("vipsthumbnail");

        Path small = service.variant("grande_abc12345.png", 320).orElseThrow();
        Path notEnlarged = service.variant("grande_abc12345.png", 1600).orElseThrow();

        assertThat(webpWidth(small)).isEqualTo(320);
        assertThat(webpWidth(notEnlarged)).isEqualTo(1000);
    }

    private static boolean isOnPath(String tool) {
        return java.util.Arrays.stream(System.getenv("PATH").split(java.io.File.pathSeparator))
                .anyMatch(dir -> Files.isExecutable(Path.of(dir, tool)));
    }

    /** Width from the header of a WebP file (plain lossy or extended format). */
    private static int webpWidth(Path file) throws IOException {
        byte[] b = Files.readAllBytes(file);
        assertThat(new String(b, 0, 4)).isEqualTo("RIFF");
        assertThat(new String(b, 8, 4)).isEqualTo("WEBP");
        String chunk = new String(b, 12, 4);
        if (chunk.equals("VP8X")) {
            return 1 + ((b[24] & 0xFF) | (b[25] & 0xFF) << 8 | (b[26] & 0xFF) << 16);
        }
        assertThat(chunk).isEqualTo("VP8 ");
        return ((b[27] & 0x3F) << 8) | (b[26] & 0xFF);
    }
}
