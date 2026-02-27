package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.model.Project;
import es.yambo_alco.web.model.SeoMetadata;
import es.yambo_alco.web.model.enums.SeoEntityType;
import es.yambo_alco.web.repository.ActivityRepository;
import es.yambo_alco.web.repository.ProjectGroupRepository;
import es.yambo_alco.web.repository.ProjectRepository;
import es.yambo_alco.web.repository.UserRepository;
import es.yambo_alco.web.service.SeoMetadataService;
import es.yambo_alco.web.service.SettingsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PublicController.class)
@Import(TestSecurityConfig.class)
@SuppressWarnings("null")
class PublicControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SettingsService settingsService;

    @MockitoBean
    private ProjectRepository projectRepository;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private ProjectGroupRepository projectGroupRepository;

    @MockitoBean
    private ActivityRepository activityRepository;

    @MockitoBean
    private SeoMetadataService seoMetadataService;

    @Test
    @WithAnonymousUser
    void getProjectSeo_WhenSeoExists_ShouldReturnSeoMetadata() throws Exception {
        // Given
        Project project = Project.builder().id("PRJ001").name("Barrio").active(true).build();
        SeoMetadata seo = SeoMetadata.builder()
                .id("SEO001")
                .entityType(SeoEntityType.PROJECT)
                .entityId("PRJ001")
                .metaDescription("Descubre el Proyecto Barrio en Alcobendas.")
                .keywords("[\"Yambo\",\"Alcobendas\",\"ocio educativo\"]")
                .ogDescription("Ocio educativo para niños en Alcobendas")
                .slug("proyecto-barrio")
                .build();

        when(projectRepository.findById("PRJ001")).thenReturn(Optional.of(project));
        when(seoMetadataService.getByEntity(SeoEntityType.PROJECT, "PRJ001")).thenReturn(Optional.of(seo));

        // When / Then
        mockMvc.perform(get("/public/projects/PRJ001/seo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metaDescription").value("Descubre el Proyecto Barrio en Alcobendas."))
                .andExpect(jsonPath("$.keywords[0]").value("Yambo"))
                .andExpect(jsonPath("$.keywords[1]").value("Alcobendas"))
                .andExpect(jsonPath("$.slug").value("proyecto-barrio"));
    }

    @Test
    @WithAnonymousUser
    void getProjectSeo_WhenSeoNotFound_ShouldReturn404() throws Exception {
        // Given
        Project project = Project.builder().id("PRJ001").name("Barrio").active(true).build();
        when(projectRepository.findById("PRJ001")).thenReturn(Optional.of(project));
        when(seoMetadataService.getByEntity(SeoEntityType.PROJECT, "PRJ001")).thenReturn(Optional.empty());

        // When / Then
        mockMvc.perform(get("/public/projects/PRJ001/seo"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithAnonymousUser
    void getProjectSeo_WhenProjectNotFound_ShouldReturn404() throws Exception {
        // Given
        when(projectRepository.findById("PRJ404")).thenReturn(Optional.empty());

        // When / Then
        mockMvc.perform(get("/public/projects/PRJ404/seo"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithAnonymousUser
    void getProjectDetail_WithSeo_ShouldIncludeSeoInResponse() throws Exception {
        // Given
        Project project = Project.builder().id("PRJ001").name("Barrio").active(true)
                .season("2025-2026").description("Test description").build();
        SeoMetadata seo = SeoMetadata.builder()
                .id("SEO001")
                .entityType(SeoEntityType.PROJECT)
                .entityId("PRJ001")
                .keywords("[\"Yambo\"]")
                .slug("proyecto-barrio")
                .build();

        when(projectRepository.findById("PRJ001")).thenReturn(Optional.of(project));
        when(projectGroupRepository.findByProjectId("PRJ001")).thenReturn(Collections.emptyList());
        when(userRepository.findMonitorsByProjectId("PRJ001")).thenReturn(Collections.emptyList());
        when(seoMetadataService.getByEntity(SeoEntityType.PROJECT, "PRJ001")).thenReturn(Optional.of(seo));

        // When / Then
        mockMvc.perform(get("/public/projects/PRJ001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("PRJ001"))
                .andExpect(jsonPath("$.name").value("Barrio"))
                .andExpect(jsonPath("$.seo.slug").value("proyecto-barrio"));
    }

    @Test
    @WithAnonymousUser
    void getProjectDetail_WithoutSeo_ShouldReturnNullSeo() throws Exception {
        // Given
        Project project = Project.builder().id("PRJ001").name("Barrio").active(true).build();

        when(projectRepository.findById("PRJ001")).thenReturn(Optional.of(project));
        when(projectGroupRepository.findByProjectId("PRJ001")).thenReturn(Collections.emptyList());
        when(userRepository.findMonitorsByProjectId("PRJ001")).thenReturn(Collections.emptyList());
        when(seoMetadataService.getByEntity(SeoEntityType.PROJECT, "PRJ001")).thenReturn(Optional.empty());

        // When / Then
        mockMvc.perform(get("/public/projects/PRJ001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("PRJ001"))
                .andExpect(jsonPath("$.seo").doesNotExist());
    }
}
