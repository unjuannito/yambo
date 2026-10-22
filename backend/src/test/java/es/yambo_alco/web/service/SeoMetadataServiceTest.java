package es.yambo_alco.web.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import es.yambo_alco.web.model.Project;
import es.yambo_alco.web.model.SeoMetadata;
import es.yambo_alco.web.model.enums.SeoEntityType;
import es.yambo_alco.web.repository.ProjectRepository;
import es.yambo_alco.web.repository.SeoMetadataRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SeoMetadataServiceTest {

    @Mock
    private SeoMetadataRepository seoMetadataRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private OllamaService ollamaService;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private BatchProgressNotifier progressNotifier;

    @InjectMocks
    private SeoMetadataService seoMetadataService;

    private static final String VALID_SEO_JSON = """
            {
              "metaDescription": "Descubre el Proyecto Barrio, un espacio de ocio educativo para niñas y niños en Alcobendas.",
              "keywords": ["Yambo", "Alcobendas", "ocio educativo", "niños", "jóvenes", "tiempo libre", "educación no formal", "talleres"],
              "ogDescription": "Descubre nuestros espacios libres de Yambo para niños y niñas.",
              "slug": "proyecto-barrio"
            }
            """;

    @Test
    void generateAndSaveForProject_NewProject_ShouldCreateSeoMetadata() {
        // Given
        Project project = Project.builder()
                .id("PRJ001")
                .name("Barrio")
                .season("2025-2026")
                .description("Proyecto de ocio y tiempo libre")
                .build();

        when(ollamaService.generate(any())).thenReturn(VALID_SEO_JSON);
        when(seoMetadataRepository.findByEntityTypeAndEntityId(SeoEntityType.PROJECT, "PRJ001"))
                .thenReturn(Optional.empty());
        when(seoMetadataRepository.save(any(SeoMetadata.class))).thenAnswer(i -> i.getArgument(0));

        // When
        seoMetadataService.generateAndSaveForProject(project);

        // Then
        ArgumentCaptor<SeoMetadata> captor = ArgumentCaptor.forClass(SeoMetadata.class);
        verify(seoMetadataRepository).save(captor.capture());

        SeoMetadata saved = captor.getValue();
        assertEquals(SeoEntityType.PROJECT, saved.getEntityType());
        assertEquals("PRJ001", saved.getEntityId());
        assertNotNull(saved.getMetaDescription());
        assertNotNull(saved.getKeywords());
        assertEquals("proyecto-barrio", saved.getSlug());
    }

    @Test
    void generateAndSaveForProject_ExistingMetadata_ShouldUpdate() {
        // Given
        Project project = Project.builder()
                .id("PRJ001")
                .name("Barrio")
                .season("2025-2026")
                .build();

        SeoMetadata existing = SeoMetadata.builder()
                .id("SEO001")
                .entityType(SeoEntityType.PROJECT)
                .entityId("PRJ001")
                .metaDescription("Old description")
                .build();

        when(ollamaService.generate(any())).thenReturn(VALID_SEO_JSON);
        when(seoMetadataRepository.findByEntityTypeAndEntityId(SeoEntityType.PROJECT, "PRJ001"))
                .thenReturn(Optional.of(existing));
        when(seoMetadataRepository.save(any(SeoMetadata.class))).thenAnswer(i -> i.getArgument(0));

        // When
        seoMetadataService.generateAndSaveForProject(project);

        // Then
        ArgumentCaptor<SeoMetadata> captor = ArgumentCaptor.forClass(SeoMetadata.class);
        verify(seoMetadataRepository).save(captor.capture());

        SeoMetadata saved = captor.getValue();
        assertEquals("SEO001", saved.getId()); // Same ID, updated record
    }

    @Test
    void generateAndSaveForProject_OllamaFailure_ShouldNotThrow() {
        // Given
        Project project = Project.builder()
                .id("PRJ001")
                .name("Barrio")
                .build();

        when(ollamaService.generate(any())).thenThrow(new OllamaService.OllamaException("Connection refused"));

        // When / Then — should not throw
        assertDoesNotThrow(() -> seoMetadataService.generateAndSaveForProject(project));
        verify(seoMetadataRepository, never()).save(any());
    }

    @Test
    void generateAndSaveForProject_InvalidJsonResponse_ShouldNotThrow() {
        // Given
        Project project = Project.builder()
                .id("PRJ001")
                .name("Barrio")
                .build();

        when(ollamaService.generate(any())).thenReturn("This is not JSON at all, just some random text.");

        // When / Then — should not throw
        assertDoesNotThrow(() -> seoMetadataService.generateAndSaveForProject(project));
        verify(seoMetadataRepository, never()).save(any());
    }

    @Test
    void generateAndSaveForProject_JsonInMarkdownCodeBlock_ShouldExtract() {
        // Given
        Project project = Project.builder()
                .id("PRJ001")
                .name("Barrio")
                .build();

        String wrappedResponse = """
                Here is the SEO metadata:
                ```json
                %s
                ```
                """.formatted(VALID_SEO_JSON);

        when(ollamaService.generate(any())).thenReturn(wrappedResponse);
        when(seoMetadataRepository.findByEntityTypeAndEntityId(SeoEntityType.PROJECT, "PRJ001"))
                .thenReturn(Optional.empty());
        when(seoMetadataRepository.save(any(SeoMetadata.class))).thenAnswer(i -> i.getArgument(0));

        // When
        seoMetadataService.generateAndSaveForProject(project);

        // Then
        verify(seoMetadataRepository).save(any(SeoMetadata.class));
    }

    @Test
    void getByEntity_ShouldReturnMetadata() {
        // Given
        SeoMetadata metadata = SeoMetadata.builder()
                .id("SEO001")
                .entityType(SeoEntityType.PROJECT)
                .entityId("PRJ001")
                .keywords("[\"Yambo\", \"Alcobendas\"]")
                .build();
        when(seoMetadataRepository.findByEntityTypeAndEntityId(SeoEntityType.PROJECT, "PRJ001"))
                .thenReturn(Optional.of(metadata));

        // When
        Optional<SeoMetadata> result = seoMetadataService.getByEntity(SeoEntityType.PROJECT, "PRJ001");

        // Then
        assertTrue(result.isPresent());
        assertEquals("SEO001", result.get().getId());
        assertEquals(SeoEntityType.PROJECT, result.get().getEntityType());
        assertEquals("PRJ001", result.get().getEntityId());
        assertEquals("[\"Yambo\", \"Alcobendas\"]", result.get().getKeywords());
    }

    @Test
    void getByEntity_WhenNotFound_ShouldReturnEmpty() {
        // Given
        when(seoMetadataRepository.findByEntityTypeAndEntityId(SeoEntityType.PROJECT, "PRJ404"))
                .thenReturn(Optional.empty());

        // When
        Optional<SeoMetadata> result = seoMetadataService.getByEntity(SeoEntityType.PROJECT, "PRJ404");

        // Then
        assertFalse(result.isPresent());
    }

    @Test
    void deleteByEntity_ShouldCallRepository() {
        // When
        seoMetadataService.deleteByEntity(SeoEntityType.PROJECT, "PRJ001");

        // Then
        verify(seoMetadataRepository).deleteByEntityTypeAndEntityId(SeoEntityType.PROJECT, "PRJ001");
    }

    @Test
    void buildProjectPrompt_ShouldContainProjectDetails() {
        // Given
        Project project = Project.builder()
                .name("Barrio")
                .season("2025-2026")
                .description("Proyecto de ocio y tiempo libre")
                .build();

        // When
        String prompt = seoMetadataService.buildProjectPrompt(project);

        // Then
        assertTrue(prompt.contains("Barrio"));
        assertTrue(prompt.contains("2025-2026"));
        assertTrue(prompt.contains("Proyecto de ocio y tiempo libre"));
        assertTrue(prompt.contains("SEO specialist"));
        assertTrue(prompt.contains("Yambo"));
        assertTrue(prompt.contains("JSON"));
    }

    @Test
    void buildProjectPrompt_WithoutOptionalFields_ShouldOmitThem() {
        // Given
        Project project = Project.builder()
                .name("Barrio")
                .build();

        // When
        String prompt = seoMetadataService.buildProjectPrompt(project);

        // Then
        assertTrue(prompt.contains("Barrio"));
        assertFalse(prompt.contains("Season:"));
        assertFalse(prompt.contains("Description:"));
    }

    @Test
    void extractJson_WithRawJson_ShouldExtract() {
        String json = SeoMetadataService.extractJson(VALID_SEO_JSON);
        assertNotNull(json);
        assertTrue(json.startsWith("{"));
    }

    @Test
    void extractJson_WithCodeBlock_ShouldExtract() {
        String input = "```json\n{\"description\": \"test\"}\n```";
        String json = SeoMetadataService.extractJson(input);
        assertNotNull(json);
        assertEquals("{\"description\": \"test\"}", json);
    }

    @Test
    void extractJson_WithNullInput_ShouldReturnNull() {
        assertNull(SeoMetadataService.extractJson(null));
    }

    @Test
    void extractJson_WithBlankInput_ShouldReturnNull() {
        assertNull(SeoMetadataService.extractJson("   "));
    }

    @Test
    void extractJson_WithNoJson_ShouldReturnNull() {
        assertNull(SeoMetadataService.extractJson("This has no JSON content at all."));
    }
}
