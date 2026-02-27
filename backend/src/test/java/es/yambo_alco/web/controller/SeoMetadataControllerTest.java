package es.yambo_alco.web.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.model.SeoMetadata;
import es.yambo_alco.web.model.enums.SeoEntityType;
import es.yambo_alco.web.service.SeoMetadataService;
import es.yambo_alco.web.util.PermissionCheckService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = SeoMetadataController.class)
@Import(TestSecurityConfig.class)
class SeoMetadataControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private SeoMetadataService seoMetadataService;

    @MockitoBean
    private PermissionCheckService permissionCheckService;

    private SeoMetadata sampleMetadata;

    @BeforeEach
    void setUp() {
        when(permissionCheckService.hasPermission(anyString(), anyString())).thenReturn(true);

        sampleMetadata = SeoMetadata.builder()
                .id("SEO00001")
                .entityType(SeoEntityType.PROJECT)
                .entityId("PROJ0001")
                .metaDescription("Test meta description")
                .keywords("[\"keyword1\",\"keyword2\"]")
                .ogDescription("Test OG description")
                .slug("proyectos/test-project")
                .build();
        sampleMetadata.setCreatedAt(LocalDateTime.of(2026, 1, 1, 12, 0));
        sampleMetadata.setUpdatedAt(LocalDateTime.of(2026, 1, 15, 14, 30));
    }

    // ── List ────────────────────────────────────────────────────

    @Test
    @WithMockUser
    void list_WithEntityTypeFilter_ShouldReturnPagedResults() throws Exception {
        Page<SeoMetadata> page = new PageImpl<>(
                List.of(sampleMetadata),
                PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "updatedAt")),
                1);

        when(seoMetadataService.listByEntityType(eq(SeoEntityType.PROJECT), any()))
                .thenReturn(page);
        when(seoMetadataService.resolveEntityName(SeoEntityType.PROJECT, "PROJ0001"))
                .thenReturn("Test Project");

        mockMvc.perform(get("/admin/seo")
                        .param("entityType", "PROJECT")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].id").value("SEO00001"))
                .andExpect(jsonPath("$.content[0].entityType").value("PROJECT"))
                .andExpect(jsonPath("$.content[0].entityName").value("Test Project"))
                .andExpect(jsonPath("$.content[0].slug").value("proyectos/test-project"));
    }

    @Test
    @WithMockUser
    void list_WithoutFilter_ShouldReturnAllResults() throws Exception {
        Page<SeoMetadata> page = new PageImpl<>(
                List.of(sampleMetadata),
                PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "updatedAt")),
                1);

        when(seoMetadataService.listAll(any())).thenReturn(page);
        when(seoMetadataService.resolveEntityName(SeoEntityType.PROJECT, "PROJ0001"))
                .thenReturn("Test Project");

        mockMvc.perform(get("/admin/seo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content.length()").value(1));
    }

    // ── Get by ID ───────────────────────────────────────────────

    @Test
    @WithMockUser
    void getById_ShouldReturnSeoMetadata() throws Exception {
        when(seoMetadataService.getById("SEO00001")).thenReturn(sampleMetadata);
        when(seoMetadataService.resolveEntityName(SeoEntityType.PROJECT, "PROJ0001"))
                .thenReturn("Test Project");

        mockMvc.perform(get("/admin/seo/SEO00001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("SEO00001"))
                .andExpect(jsonPath("$.entityType").value("PROJECT"))
                .andExpect(jsonPath("$.metaDescription").value("Test meta description"))
                .andExpect(jsonPath("$.slug").value("proyectos/test-project"));
    }

    // ── Update ──────────────────────────────────────────────────

    @Test
    @WithMockUser
    void update_ShouldReturnUpdatedMetadata() throws Exception {
        SeoMetadata updatedMetadata = SeoMetadata.builder()
                .id("SEO00001")
                .entityType(SeoEntityType.PROJECT)
                .entityId("PROJ0001")
                .metaDescription("Updated description")
                .keywords("[\"new-keyword\"]")
                .ogDescription("Updated OG")
                .slug("proyectos/updated-slug")
                .build();
        updatedMetadata.setCreatedAt(LocalDateTime.of(2026, 1, 1, 12, 0));
        updatedMetadata.setUpdatedAt(LocalDateTime.of(2026, 2, 1, 10, 0));

        when(seoMetadataService.updateManually(
                eq("SEO00001"), eq("Updated description"),
                eq("[\"new-keyword\"]"), eq("Updated OG"), eq("proyectos/updated-slug")))
                .thenReturn(updatedMetadata);
        when(seoMetadataService.resolveEntityName(SeoEntityType.PROJECT, "PROJ0001"))
                .thenReturn("Test Project");

        SeoMetadataController.SeoMetadataUpdateRequest request = new SeoMetadataController.SeoMetadataUpdateRequest();
        request.setMetaDescription("Updated description");
        request.setKeywords("[\"new-keyword\"]");
        request.setOgDescription("Updated OG");
        request.setSlug("proyectos/updated-slug");

        mockMvc.perform(put("/admin/seo/SEO00001")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metaDescription").value("Updated description"))
                .andExpect(jsonPath("$.slug").value("proyectos/updated-slug"));
    }

    // ── Delete ──────────────────────────────────────────────────

    @Test
    @WithMockUser
    void delete_ShouldReturnSuccessMessage() throws Exception {
        doNothing().when(seoMetadataService).deleteById("SEO00001");

        mockMvc.perform(delete("/admin/seo/SEO00001"))
                .andExpect(status().isOk())
                .andExpect(content().string("SEO metadata eliminado correctamente"));

        verify(seoMetadataService).deleteById("SEO00001");
    }

    // ── Regenerate ──────────────────────────────────────────────

    @Test
    @WithMockUser
    void regenerate_ShouldTriggerRegeneration() throws Exception {
        doNothing().when(seoMetadataService).regenerateForProject("PROJ0001");

        mockMvc.perform(post("/admin/seo/PROJECT/PROJ0001/regenerate"))
                .andExpect(status().isOk())
                .andExpect(content().string("Regeneración SEO iniciada"));

        verify(seoMetadataService).regenerateForProject("PROJ0001");
    }

    // ── Bulk Generate ───────────────────────────────────────────

    @Test
    @WithMockUser
    void bulkGenerate_ShouldTriggerBulkGeneration() throws Exception {
        doNothing().when(seoMetadataService).bulkGenerateForProjects();

        mockMvc.perform(post("/admin/seo/bulk-generate"))
                .andExpect(status().isOk())
                .andExpect(content().string("Generación masiva SEO iniciada"));

        verify(seoMetadataService).bulkGenerateForProjects();
    }
}
