package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.model.Image;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.ImageUsageContext;
import es.yambo_alco.web.service.ImageService;
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

@WebMvcTest(controllers = ImageController.class)
@Import(TestSecurityConfig.class)
class ImageControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ImageService imageService;

    private Image createTestImage() {
        User uploader = User.builder()
                .id("U0000001")
                .name("Test User")
                .email("test@example.com")
                .password("password")
                .build();

        return Image.builder()
                .id("IMG00001")
                .originalName("test.jpg")
                .storedName("uuid-test.jpg")
                .contentType("image/jpeg")
                .size(1024L)
                .url("/uploads/uuid-test.jpg")
                .context(ImageUsageContext.PRODUCT_IMAGE)
                .referenceId("PRD00001")
                .uploadedBy(uploader)
                .uploadedAt(LocalDateTime.of(2026, 2, 23, 10, 0, 0))
                .build();
    }

    @Test
    @WithMockUser
    void upload_WithValidFile_ShouldReturnCreated() throws Exception {
        // Given
        Image image = createTestImage();
        when(imageService.upload(any(), eq(ImageUsageContext.PRODUCT_IMAGE), eq("PRD00001")))
                .thenReturn(image);

        MockMultipartFile file = new MockMultipartFile(
                "file", "test.jpg", "image/jpeg", "fake-image-content".getBytes());

        // When & Then
        mockMvc.perform(multipart("/images")
                .file(file)
                .param("context", "PRODUCT_IMAGE")
                .param("referenceId", "PRD00001"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("IMG00001"))
                .andExpect(jsonPath("$.originalName").value("test.jpg"))
                .andExpect(jsonPath("$.contentType").value("image/jpeg"))
                .andExpect(jsonPath("$.size").value(1024))
                .andExpect(jsonPath("$.url").value("/uploads/uuid-test.jpg"))
                .andExpect(jsonPath("$.context").value("PRODUCT_IMAGE"))
                .andExpect(jsonPath("$.referenceId").value("PRD00001"))
                .andExpect(jsonPath("$.uploadedBy").value("U0000001"))
                .andExpect(jsonPath("$.uploadedByName").value("Test User"));
    }

    @Test
    @WithMockUser
    void upload_WithoutReferenceId_ShouldReturnCreated() throws Exception {
        // Given
        Image image = createTestImage();
        image.setReferenceId(null);
        when(imageService.upload(any(), eq(ImageUsageContext.USER_PHOTO), isNull()))
                .thenReturn(image);

        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.png", "image/png", "fake-image-content".getBytes());

        // When & Then
        mockMvc.perform(multipart("/images")
                .file(file)
                .param("context", "USER_PHOTO"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("IMG00001"));
    }

    @Test
    @WithMockUser
    void getById_WithExistingId_ShouldReturnImage() throws Exception {
        // Given
        Image image = createTestImage();
        when(imageService.getById("IMG00001")).thenReturn(image);

        // When & Then
        mockMvc.perform(get("/images/IMG00001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("IMG00001"))
                .andExpect(jsonPath("$.originalName").value("test.jpg"))
                .andExpect(jsonPath("$.context").value("PRODUCT_IMAGE"));
    }

    @Test
    @WithMockUser
    void list_ByContextAndReference_ShouldReturnList() throws Exception {
        // Given
        Image image1 = createTestImage();
        Image image2 = createTestImage();
        image2.setId("IMG00002");
        image2.setOriginalName("test2.jpg");

        when(imageService.listByContextAndReference(ImageUsageContext.PRODUCT_IMAGE, "PRD00001"))
                .thenReturn(List.of(image1, image2));

        // When & Then
        mockMvc.perform(get("/images")
                .param("context", "PRODUCT_IMAGE")
                .param("referenceId", "PRD00001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value("IMG00001"))
                .andExpect(jsonPath("$[1].id").value("IMG00002"));
    }

    @Test
    @WithMockUser
    void list_ByContextOnly_ShouldReturnList() throws Exception {
        // Given
        Image image = createTestImage();
        when(imageService.listByContextAndReference(ImageUsageContext.USER_PHOTO, null))
                .thenReturn(List.of(image));

        // When & Then
        mockMvc.perform(get("/images")
                .param("context", "USER_PHOTO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    @WithMockUser
    void listMine_ShouldReturnCurrentUserImages() throws Exception {
        // Given
        Image image = createTestImage();
        when(imageService.listMyImages()).thenReturn(List.of(image));

        // When & Then
        mockMvc.perform(get("/images/mine"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value("IMG00001"));
    }

    @Test
    @WithMockUser
    void delete_WithExistingId_ShouldReturnNoContent() throws Exception {
        // Given
        doNothing().when(imageService).delete("IMG00001");

        // When & Then
        mockMvc.perform(delete("/images/IMG00001"))
                .andExpect(status().isNoContent());

        verify(imageService).delete("IMG00001");
    }

    @Test
    @WithAnonymousUser
    void upload_Unauthenticated_ShouldReturnForbidden() throws Exception {
        // Anonymous users should be blocked by @PreAuthorize("isAuthenticated()")
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.jpg", "image/jpeg", "fake-image-content".getBytes());

        mockMvc.perform(multipart("/images")
                .file(file)
                .param("context", "PRODUCT_IMAGE")
                .param("referenceId", "PRD00001"))
                .andExpect(status().isForbidden());
    }
}
