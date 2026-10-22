package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.ForbiddenException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.UploadedFile;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.UploadedFileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.mock.web.MockMultipartFile;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class UploadedFileServiceTest {

    private UploadedFileRepository uploadedFileRepository;
    private FileStorageService fileStorageService;
    private AuthService authService;
    private UploadedFileService uploadedFileService;

    private User testUser;

    @BeforeEach
    public void setup() {
        uploadedFileRepository = Mockito.mock(UploadedFileRepository.class);
        fileStorageService = Mockito.mock(FileStorageService.class);
        authService = Mockito.mock(AuthService.class);
        uploadedFileService = new UploadedFileService(uploadedFileRepository, fileStorageService, authService);

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
    public void upload_WithValidFile_ShouldSaveAndReturnFile() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.jpg", "image/jpeg", "fake-content".getBytes());

        when(fileStorageService.store(any())).thenReturn("test_a7bx3k9q.jpg");
        when(uploadedFileRepository.save(any(UploadedFile.class))).thenAnswer(invocation -> {
            UploadedFile f = invocation.getArgument(0);
            f.setId("FL000001");
            return f;
        });

        UploadedFile result = uploadedFileService.upload(file);

        assertThat(result.getOriginalName()).isEqualTo("test.jpg");
        assertThat(result.getStoredName()).isEqualTo("test_a7bx3k9q.jpg");
        assertThat(result.getUrl()).isEqualTo("/uploads/test_a7bx3k9q.jpg");
        assertThat(result.getUploadedBy()).isEqualTo(testUser);
        verify(uploadedFileRepository).save(any(UploadedFile.class));
        verify(fileStorageService).store(file);
    }

    @Test
    public void upload_PdfFile_ShouldSaveAndReturnFile() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "report.pdf", "application/pdf", "fake-pdf-content".getBytes());

        when(fileStorageService.store(any())).thenReturn("report_x8k3m2nq.pdf");
        when(uploadedFileRepository.save(any(UploadedFile.class))).thenAnswer(invocation -> {
            UploadedFile f = invocation.getArgument(0);
            f.setId("FL000002");
            return f;
        });

        UploadedFile result = uploadedFileService.upload(file);

        assertThat(result.getOriginalName()).isEqualTo("report.pdf");
        assertThat(result.getStoredName()).isEqualTo("report_x8k3m2nq.pdf");
        assertThat(result.getContentType()).isEqualTo("application/pdf");
        verify(uploadedFileRepository).save(any(UploadedFile.class));
    }

    @Test
    public void getById_WhenExists_ShouldReturnFile() {
        UploadedFile uploadedFile = UploadedFile.builder()
                .id("FL000001")
                .originalName("test.jpg")
                .build();

        when(uploadedFileRepository.findById("FL000001")).thenReturn(Optional.of(uploadedFile));

        UploadedFile result = uploadedFileService.getById("FL000001");

        assertThat(result.getId()).isEqualTo("FL000001");
    }

    @Test
    public void getById_WhenNotExists_ShouldThrowNotFound() {
        when(uploadedFileRepository.findById("FL999999")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> uploadedFileService.getById("FL999999"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("File not found");
    }

    @Test
    public void listMyFiles_ShouldReturnCurrentUserFiles() {
        UploadedFile file = UploadedFile.builder().id("FL000001").build();
        when(uploadedFileRepository.findByUploadedById("U0000001")).thenReturn(List.of(file));

        List<UploadedFile> result = uploadedFileService.listMyFiles();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("FL000001");
    }

    @Test
    public void delete_ByOwner_ShouldDeleteFileAndRecord() {
        UploadedFile file = UploadedFile.builder()
                .id("FL000001")
                .storedName("test_a7bx3k9q.jpg")
                .uploadedBy(testUser)
                .build();

        when(uploadedFileRepository.findById("FL000001")).thenReturn(Optional.of(file));

        uploadedFileService.delete("FL000001");

        verify(fileStorageService).delete("test_a7bx3k9q.jpg");
        verify(uploadedFileRepository).delete(file);
    }

    @Test
    public void delete_ByNonOwnerNonAdmin_ShouldThrowForbidden() {
        User otherUser = User.builder()
                .id("U0000002")
                .name("Other User")
                .email("other@example.com")
                .password("password")
                .profiles(Set.of())
                .build();

        UploadedFile file = UploadedFile.builder()
                .id("FL000001")
                .storedName("test_a7bx3k9q.jpg")
                .uploadedBy(otherUser)
                .build();

        when(uploadedFileRepository.findById("FL000001")).thenReturn(Optional.of(file));

        assertThatThrownBy(() -> uploadedFileService.delete("FL000001"))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("You can only delete your own files");

        verify(fileStorageService, never()).delete(anyString());
        verify(uploadedFileRepository, never()).delete(any(UploadedFile.class));
    }

    @Test
    public void delete_WhenFileNotFound_ShouldThrowNotFound() {
        when(uploadedFileRepository.findById("FL999999")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> uploadedFileService.delete("FL999999"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("File not found");
    }
}
