package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.ForbiddenException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.Image;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.ImageUsageContext;
import es.yambo_alco.web.repository.ImageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class ImageServiceTest {

    private ImageRepository imageRepository;
    private FileStorageService fileStorageService;
    private AuthService authService;
    private ImageService imageService;

    private User testUser;

    @BeforeEach
    public void setup() {
        imageRepository = Mockito.mock(ImageRepository.class);
        fileStorageService = Mockito.mock(FileStorageService.class);
        authService = Mockito.mock(AuthService.class);
        imageService = new ImageService(imageRepository, fileStorageService, authService);

        testUser = User.builder()
                .id("U0000001")
                .name("Test User")
                .email("test@example.com")
                .password("password")
                .profiles(Set.of())
                .build();

        when(authService.getCurrentUser(true)).thenReturn(testUser);
    }

    @Test
    public void upload_WithValidFile_ShouldSaveAndReturnImage() {
        // Given
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.jpg", "image/jpeg", "fake-content".getBytes());

        when(fileStorageService.store(any())).thenReturn("uuid-test.jpg");
        when(imageRepository.findByContextAndReferenceId(any(), any())).thenReturn(Collections.emptyList());
        when(imageRepository.save(any(Image.class))).thenAnswer(invocation -> {
            Image img = invocation.getArgument(0);
            img.setId("IMG00001");
            return img;
        });

        // When
        Image result = imageService.upload(file, ImageUsageContext.PRODUCT_IMAGE, "PRD00001");

        // Then
        assertThat(result.getOriginalName()).isEqualTo("test.jpg");
        assertThat(result.getStoredName()).isEqualTo("uuid-test.jpg");
        assertThat(result.getUrl()).isEqualTo("/uploads/uuid-test.jpg");
        assertThat(result.getContext()).isEqualTo(ImageUsageContext.PRODUCT_IMAGE);
        assertThat(result.getReferenceId()).isEqualTo("PRD00001");
        assertThat(result.getUploadedBy()).isEqualTo(testUser);
        verify(imageRepository).save(any(Image.class));
        verify(fileStorageService).store(file);
    }

    @Test
    public void upload_WithReplacePreviousContext_ShouldDeleteExistingImages() {
        // Given - USER_PHOTO has replacePrevious=true
        MockMultipartFile file = new MockMultipartFile(
                "file", "new-photo.jpg", "image/jpeg", "content".getBytes());

        Image existingImage = Image.builder()
                .id("IMG00001")
                .storedName("old-photo.jpg")
                .context(ImageUsageContext.USER_PHOTO)
                .referenceId("U0000001")
                .uploadedBy(testUser)
                .build();

        when(imageRepository.findByContextAndReferenceId(ImageUsageContext.USER_PHOTO, "U0000001"))
                .thenReturn(List.of(existingImage));
        when(fileStorageService.store(any())).thenReturn("uuid-new-photo.jpg");
        when(imageRepository.save(any(Image.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        imageService.upload(file, ImageUsageContext.USER_PHOTO, "U0000001");

        // Then
        verify(fileStorageService).delete("old-photo.jpg");
        verify(imageRepository).delete(existingImage);
        verify(imageRepository).save(any(Image.class));
    }

    @Test
    public void upload_WithNonReplacePreviousContext_ShouldNotDeleteExisting() {
        // Given - PRODUCT_IMAGE has replacePrevious=false
        MockMultipartFile file = new MockMultipartFile(
                "file", "product.jpg", "image/jpeg", "content".getBytes());

        when(fileStorageService.store(any())).thenReturn("uuid-product.jpg");
        when(imageRepository.save(any(Image.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        imageService.upload(file, ImageUsageContext.PRODUCT_IMAGE, "PRD00001");

        // Then
        verify(imageRepository, never()).findByContextAndReferenceId(any(), any());
        verify(imageRepository, never()).delete(any(Image.class));
        verify(imageRepository).save(any(Image.class));
    }

    @Test
    public void getById_WhenExists_ShouldReturnImage() {
        // Given
        Image image = Image.builder()
                .id("IMG00001")
                .originalName("test.jpg")
                .build();

        when(imageRepository.findById("IMG00001")).thenReturn(Optional.of(image));

        // When
        Image result = imageService.getById("IMG00001");

        // Then
        assertThat(result.getId()).isEqualTo("IMG00001");
    }

    @Test
    public void getById_WhenNotExists_ShouldThrowNotFound() {
        // Given
        when(imageRepository.findById("IMG99999")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> imageService.getById("IMG99999"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Image not found");
    }

    @Test
    public void listByContextAndReference_ShouldReturnMatchingImages() {
        // Given
        Image image1 = Image.builder().id("IMG00001").build();
        Image image2 = Image.builder().id("IMG00002").build();

        when(imageRepository.findByContextAndReferenceId(ImageUsageContext.PRODUCT_IMAGE, "PRD00001"))
                .thenReturn(List.of(image1, image2));

        // When
        List<Image> result = imageService.listByContextAndReference(ImageUsageContext.PRODUCT_IMAGE, "PRD00001");

        // Then
        assertThat(result).hasSize(2);
    }

    @Test
    public void listMyImages_ShouldReturnCurrentUserImages() {
        // Given
        Image image = Image.builder().id("IMG00001").build();
        when(imageRepository.findByUploadedById("U0000001")).thenReturn(List.of(image));

        // When
        List<Image> result = imageService.listMyImages();

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("IMG00001");
    }

    @Test
    public void delete_ByOwner_ShouldDeleteImageAndFile() {
        // Given
        Image image = Image.builder()
                .id("IMG00001")
                .storedName("uuid-test.jpg")
                .uploadedBy(testUser)
                .build();

        when(imageRepository.findById("IMG00001")).thenReturn(Optional.of(image));

        // When
        imageService.delete("IMG00001");

        // Then
        verify(fileStorageService).delete("uuid-test.jpg");
        verify(imageRepository).delete(image);
    }

    @Test
    public void delete_ByNonOwnerNonAdmin_ShouldThrowForbidden() {
        // Given
        User otherUser = User.builder()
                .id("U0000002")
                .name("Other User")
                .email("other@example.com")
                .password("password")
                .profiles(Set.of())
                .build();

        Image image = Image.builder()
                .id("IMG00001")
                .storedName("uuid-test.jpg")
                .uploadedBy(otherUser)
                .build();

        when(imageRepository.findById("IMG00001")).thenReturn(Optional.of(image));

        // When & Then
        assertThatThrownBy(() -> imageService.delete("IMG00001"))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("You can only delete your own images");

        verify(fileStorageService, never()).delete(anyString());
        verify(imageRepository, never()).delete(any(Image.class));
    }

    @Test
    public void delete_WhenImageNotFound_ShouldThrowNotFound() {
        // Given
        when(imageRepository.findById("IMG99999")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> imageService.delete("IMG99999"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Image not found");
    }

    @Test
    public void upload_WithMarkdownImageContext_ShouldNotDeleteExisting() {
        // Given — MARKDOWN_IMAGE has replacePrevious=false
        MockMultipartFile file = new MockMultipartFile(
                "file", "screenshot.png", "image/png", "content".getBytes());

        when(fileStorageService.store(any())).thenReturn("uuid-screenshot.png");
        when(imageRepository.save(any(Image.class))).thenAnswer(invocation -> {
            Image img = invocation.getArgument(0);
            img.setId("IMG00003");
            return img;
        });

        // When
        Image result = imageService.upload(file, ImageUsageContext.MARKDOWN_IMAGE, null);

        // Then
        assertThat(result.getContext()).isEqualTo(ImageUsageContext.MARKDOWN_IMAGE);
        assertThat(result.getStoredName()).isEqualTo("uuid-screenshot.png");
        verify(imageRepository, never()).findByContextAndReferenceId(any(), any());
        verify(imageRepository, never()).delete(any(Image.class));
        verify(imageRepository).save(any(Image.class));
    }
}
