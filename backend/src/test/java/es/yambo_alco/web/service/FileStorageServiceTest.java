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
    public void store_WithPdfFile_ShouldStoreSuccessfully() {
        // Given - any file type is accepted (no MIME filtering)
        MockMultipartFile file = new MockMultipartFile(
                "file", "doc.pdf", "application/pdf", "fake-content".getBytes());

        // When
        String storedName = fileStorageService.store(file);

        // Then
        assertThat(storedName).endsWith(".pdf");
        assertThat(storedName).contains("doc");
        assertThat(Files.exists(tempDir.resolve(storedName))).isTrue();
    }

    @Test
    public void store_StoredNameShouldResembleOriginalName() {
        // Given
        MockMultipartFile file = new MockMultipartFile(
                "file", "My Vacation Photo (2).jpeg", "image/jpeg", "content".getBytes());

        // When
        String storedName = fileStorageService.store(file);

        // Then - should contain sanitized version of original name
        assertThat(storedName).startsWith("my-vacation-photo-2_");
        assertThat(storedName).endsWith(".jpeg");
        // Should have salt after underscore
        String nameWithoutExt = storedName.replace(".jpeg", "");
        assertThat(nameWithoutExt).matches("my-vacation-photo-2_[a-z0-9]{8}");
    }

    @Test
    public void sanitize_ShouldLowercaseAndReplaceSpecialChars() {
        assertThat(fileStorageService.sanitize("My Photo")).isEqualTo("my-photo");
        assertThat(fileStorageService.sanitize("UPPERCASE")).isEqualTo("uppercase");
        assertThat(fileStorageService.sanitize("file (1)")).isEqualTo("file-1");
        assertThat(fileStorageService.sanitize("hello---world")).isEqualTo("hello-world");
        assertThat(fileStorageService.sanitize("  spaces  ")).isEqualTo("spaces");
        assertThat(fileStorageService.sanitize("café_résumé")).isEqualTo("caf-r-sum");
        assertThat(fileStorageService.sanitize("")).isEqualTo("file");
        assertThat(fileStorageService.sanitize(null)).isEqualTo("file");
        assertThat(fileStorageService.sanitize("!!@@##")).isEqualTo("file");
    }

    @Test
    public void sanitize_ShouldTruncateLongNames() {
        String longName = "a".repeat(100);
        String result = fileStorageService.sanitize(longName);
        assertThat(result.length()).isLessThanOrEqualTo(50);
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
        assertThat(storedName).startsWith("noext_");
        assertThat(Files.exists(tempDir.resolve(storedName))).isTrue();
    }

    @Test
    public void store_ShouldGenerateUniqueSalts() {
        // Given
        MockMultipartFile file1 = new MockMultipartFile(
                "file", "same.jpg", "image/jpeg", "content1".getBytes());
        MockMultipartFile file2 = new MockMultipartFile(
                "file", "same.jpg", "image/jpeg", "content2".getBytes());

        // When
        String stored1 = fileStorageService.store(file1);
        String stored2 = fileStorageService.store(file2);

        // Then - both should start with "same_" but have different salts
        assertThat(stored1).startsWith("same_");
        assertThat(stored2).startsWith("same_");
        assertThat(stored1).isNotEqualTo(stored2);
    }
}
