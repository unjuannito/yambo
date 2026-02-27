package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.model.UploadedFile;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.service.UploadedFileService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = UploadedFileController.class)
@Import(TestSecurityConfig.class)
class UploadedFileControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UploadedFileService uploadedFileService;

    private UploadedFile createTestFile() {
        User uploader = User.builder()
                .id("U0000001")
                .name("Test User")
                .email("test@example.com")
                .password("password")
                .build();

        return UploadedFile.builder()
                .id("FL000001")
                .originalName("test.jpg")
                .storedName("test_a7bx3k9q.jpg")
                .contentType("image/jpeg")
                .size(1024L)
                .url("/uploads/test_a7bx3k9q.jpg")
                .uploadedBy(uploader)
                .uploadedAt(LocalDateTime.of(2026, 2, 23, 10, 0, 0))
                .build();
    }

    @Test
    @WithMockUser
    void upload_WithValidFile_ShouldReturnCreated() throws Exception {
        UploadedFile file = createTestFile();
        when(uploadedFileService.upload(any())).thenReturn(file);

        MockMultipartFile multipartFile = new MockMultipartFile(
                "file", "test.jpg", "image/jpeg", "fake-image-content".getBytes());

        mockMvc.perform(multipart("/files")
                .file(multipartFile))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("FL000001"))
                .andExpect(jsonPath("$.originalName").value("test.jpg"))
                .andExpect(jsonPath("$.contentType").value("image/jpeg"))
                .andExpect(jsonPath("$.size").value(1024))
                .andExpect(jsonPath("$.url").value("/uploads/test_a7bx3k9q.jpg"))
                .andExpect(jsonPath("$.uploadedBy").value("U0000001"))
                .andExpect(jsonPath("$.uploadedByName").value("Test User"));
    }

    @Test
    @WithMockUser
    void upload_PdfFile_ShouldReturnCreated() throws Exception {
        UploadedFile file = createTestFile();
        file.setOriginalName("report.pdf");
        file.setContentType("application/pdf");
        file.setStoredName("report_x8k3m2nq.pdf");
        file.setUrl("/uploads/report_x8k3m2nq.pdf");
        when(uploadedFileService.upload(any())).thenReturn(file);

        MockMultipartFile multipartFile = new MockMultipartFile(
                "file", "report.pdf", "application/pdf", "fake-pdf-content".getBytes());

        mockMvc.perform(multipart("/files")
                .file(multipartFile))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.originalName").value("report.pdf"))
                .andExpect(jsonPath("$.contentType").value("application/pdf"));
    }

    @Test
    @WithMockUser
    void getById_WithExistingId_ShouldReturnFile() throws Exception {
        UploadedFile file = createTestFile();
        when(uploadedFileService.getById("FL000001")).thenReturn(file);

        mockMvc.perform(get("/files/FL000001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("FL000001"))
                .andExpect(jsonPath("$.originalName").value("test.jpg"));
    }

    @Test
    @WithMockUser
    void listMine_ShouldReturnCurrentUserFiles() throws Exception {
        UploadedFile file = createTestFile();
        when(uploadedFileService.listMyFiles()).thenReturn(List.of(file));

        mockMvc.perform(get("/files/mine"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value("FL000001"));
    }

    @Test
    @WithMockUser
    void delete_WithExistingId_ShouldReturnNoContent() throws Exception {
        doNothing().when(uploadedFileService).delete("FL000001");

        mockMvc.perform(delete("/files/FL000001"))
                .andExpect(status().isNoContent());

        verify(uploadedFileService).delete("FL000001");
    }

    @Test
    @WithAnonymousUser
    void upload_Unauthenticated_ShouldReturnForbidden() throws Exception {
        MockMultipartFile multipartFile = new MockMultipartFile(
                "file", "test.jpg", "image/jpeg", "fake-image-content".getBytes());

        mockMvc.perform(multipart("/files")
                .file(multipartFile))
                .andExpect(status().isForbidden());
    }
}
