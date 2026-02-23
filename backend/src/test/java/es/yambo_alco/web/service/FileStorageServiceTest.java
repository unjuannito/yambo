package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mockito;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

public class FileStorageServiceTest {

    private SettingsService settingsService;
    private FileStorageService fileStorageService;

    @TempDir
    Path tempDir;

    @BeforeEach
    public void setup() {
        settingsService = Mockito.mock(SettingsService.class);
        fileStorageService = new FileStorageService(settingsService);

        // Set the upload dir via reflection and initialize
        ReflectionTestUtils.setField(fileStorageService, "uploadDir", tempDir.toString());
        fileStorageService.init();

        // Default settings
        when(settingsService.getUploadMaxFileSizeMb()).thenReturn(5);
        when(settingsService.getUploadAllowedTypes()).thenReturn(
                Set.of("image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"));
    }

    @Test
    public void store_WithValidFile_ShouldSaveAndReturnStoredName() {
        // Given
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.jpg", "image/jpeg", "fake-image-content".getBytes());

        // When
        String storedName = fileStorageService.store(file);

        // Then
        assertThat(storedName).isNotBlank();
        assertThat(storedName).endsWith(".jpg");
        assertThat(Files.exists(tempDir.resolve(storedName))).isTrue();
    }

    @Test
    public void store_WithPngFile_ShouldPreserveExtension() {
        // Given
        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.png", "image/png", "fake-content".getBytes());

        // When
        String storedName = fileStorageService.store(file);

        // Then
        assertThat(storedName).endsWith(".png");
    }

    @Test
    public void store_WithEmptyFile_ShouldThrowBadRequest() {
        // Given
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.jpg", "image/jpeg", new byte[0]);

        // When & Then
        assertThatThrownBy(() -> fileStorageService.store(file))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("File is empty");
    }

    @Test
    public void store_WithNullFile_ShouldThrowBadRequest() {
        // When & Then
        assertThatThrownBy(() -> fileStorageService.store(null))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("File is empty");
    }

    @Test
    public void store_WithOversizedFile_ShouldThrowBadRequest() {
        // Given - 5MB limit, create 6MB content
        when(settingsService.getUploadMaxFileSizeMb()).thenReturn(5);
        byte[] largeContent = new byte[6 * 1024 * 1024];
        MockMultipartFile file = new MockMultipartFile(
                "file", "large.jpg", "image/jpeg", largeContent);

        // When & Then
        assertThatThrownBy(() -> fileStorageService.store(file))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("File size exceeds maximum allowed size");
    }

    @Test
    public void store_WithDisallowedContentType_ShouldThrowBadRequest() {
        // Given
        MockMultipartFile file = new MockMultipartFile(
                "file", "doc.pdf", "application/pdf", "fake-content".getBytes());

        // When & Then
        assertThatThrownBy(() -> fileStorageService.store(file))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("File type not allowed");
    }

    @Test
    public void delete_ExistingFile_ShouldRemoveFile() throws IOException {
        // Given
        Path testFile = tempDir.resolve("to-delete.jpg");
        Files.write(testFile, "content".getBytes());
        assertThat(Files.exists(testFile)).isTrue();

        // When
        fileStorageService.delete("to-delete.jpg");

        // Then
        assertThat(Files.exists(testFile)).isFalse();
    }

    @Test
    public void delete_NonExistingFile_ShouldNotThrow() {
        // When & Then - should not throw
        fileStorageService.delete("nonexistent.jpg");
    }

    @Test
    public void getFilePath_ExistingFile_ShouldReturnPath() throws IOException {
        // Given
        Path testFile = tempDir.resolve("existing.jpg");
        Files.write(testFile, "content".getBytes());

        // When
        Path result = fileStorageService.getFilePath("existing.jpg");

        // Then
        assertThat(result).isEqualTo(testFile);
    }

    @Test
    public void getFilePath_NonExistingFile_ShouldThrowNotFound() {
        // When & Then
        assertThatThrownBy(() -> fileStorageService.getFilePath("missing.jpg"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("File not found");
    }

    @Test
    public void getFilePath_PathTraversal_ShouldThrowBadRequest() {
        // When & Then
        assertThatThrownBy(() -> fileStorageService.getFilePath("../../../etc/passwd"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Invalid file path");
    }

    @Test
    public void store_WithFileWithoutExtension_ShouldStoreSuccessfully() {
        // Given
        MockMultipartFile file = new MockMultipartFile(
                "file", "noext", "image/jpeg", "content".getBytes());

        // When
        String storedName = fileStorageService.store(file);

        // Then
        assertThat(storedName).isNotBlank();
        assertThat(Files.exists(tempDir.resolve(storedName))).isTrue();
    }
}
