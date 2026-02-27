package es.yambo_alco.web.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.Project;
import es.yambo_alco.web.model.SeoMetadata;
import es.yambo_alco.web.model.enums.SeoEntityType;
import es.yambo_alco.web.repository.ProjectRepository;
import es.yambo_alco.web.repository.SeoMetadataRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SeoMetadataService {

    private final SeoMetadataRepository seoMetadataRepository;
    private final ProjectRepository projectRepository;
    private final OllamaService ollamaService;
    private final ObjectMapper objectMapper;

    private static final Pattern JSON_BLOCK_PATTERN = Pattern.compile("\\{[^{}]*(?:\\{[^{}]*}[^{}]*)*}",
            Pattern.DOTALL);

    @Async
    @Transactional
    public void generateAndSaveForProject(Project project) {
        try {
            String prompt = buildProjectPrompt(project);
            log.info("Generating SEO metadata for project '{}' (id: {})", project.getName(), project.getId());

            String aiResponse = ollamaService.generate(prompt);
            String json = extractJson(aiResponse);

            if (json == null) {
                log.warn("Could not extract JSON from Ollama response for project '{}'", project.getName());
                return;
            }

            JsonNode seoData = objectMapper.readTree(json);
            upsertSeoMetadata(SeoEntityType.PROJECT, project.getId(), seoData);

            log.info("SEO metadata saved for project '{}' (id: {})", project.getName(), project.getId());

        } catch (Exception e) {
            log.error("Failed to generate SEO metadata for project '{}' (id: {}): {}",
                    project.getName(), project.getId(), e.getMessage(), e);
        }
    }

    public Optional<SeoMetadata> getByEntity(SeoEntityType entityType, String entityId) {
        return seoMetadataRepository.findByEntityTypeAndEntityId(entityType, entityId);
    }

    @Transactional
    public void deleteByEntity(SeoEntityType entityType, String entityId) {
        seoMetadataRepository.deleteByEntityTypeAndEntityId(entityType, entityId);
    }

    // ── Admin listing methods ──────────────────────────────────

    public Page<SeoMetadata> listAll(Pageable pageable) {
        return seoMetadataRepository.findAll(pageable);
    }

    public Page<SeoMetadata> listByEntityType(SeoEntityType entityType, Pageable pageable) {
        return seoMetadataRepository.findByEntityType(entityType, pageable);
    }

    public SeoMetadata getById(String id) {
        return seoMetadataRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SEO metadata not found"));
    }

    @Transactional
    public void deleteById(String id) {
        SeoMetadata metadata = getById(id);
        seoMetadataRepository.delete(metadata);
    }

    // ── Manual update ──────────────────────────────────────────

    @Transactional
    public SeoMetadata updateManually(String id, String metaDescription, String keywords,
                                      String ogDescription, String slug) {
        SeoMetadata metadata = getById(id);
        if (metaDescription != null) {
            metadata.setMetaDescription(truncate(metaDescription, 200));
        }
        if (keywords != null) {
            metadata.setKeywords(keywords);
        }
        if (ogDescription != null) {
            metadata.setOgDescription(truncate(ogDescription, 300));
        }
        if (slug != null) {
            metadata.setSlug(truncate(slug, 200));
        }
        return seoMetadataRepository.save(metadata);
    }

    // ── AI regeneration ────────────────────────────────────────

    @Async
    @Transactional
    public void regenerateForProject(String entityId) {
        Project project = projectRepository.findById(entityId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        generateAndSaveForProject(project);
    }

    @Async
    public void bulkGenerateForProjects() {
        List<Project> allProjects = projectRepository.findAll();
        Set<String> existingEntityIds = seoMetadataRepository.findByEntityType(SeoEntityType.PROJECT)
                .stream()
                .map(SeoMetadata::getEntityId)
                .collect(Collectors.toSet());

        List<Project> missing = allProjects.stream()
                .filter(p -> !existingEntityIds.contains(p.getId()))
                .toList();

        log.info("Bulk SEO generation: {} projects missing metadata out of {} total",
                missing.size(), allProjects.size());

        for (Project project : missing) {
            try {
                generateAndSaveForProject(project);
            } catch (Exception e) {
                log.error("Bulk generation failed for project '{}': {}", project.getName(), e.getMessage());
            }
        }

        log.info("Bulk SEO generation completed");
    }

    // ── Entity name resolution ─────────────────────────────────

    public String resolveEntityName(SeoEntityType entityType, String entityId) {
        if (entityType == SeoEntityType.PROJECT) {
            return projectRepository.findById(entityId)
                    .map(Project::getName)
                    .orElse("(eliminado)");
        }
        return entityId;
    }

    private void upsertSeoMetadata(SeoEntityType entityType, String entityId, JsonNode seoData)
            throws JsonProcessingException {
        Optional<SeoMetadata> existing = seoMetadataRepository.findByEntityTypeAndEntityId(entityType, entityId);

        SeoMetadata metadata;
        if (existing.isPresent()) {
            metadata = existing.get();
        } else {
            metadata = SeoMetadata.builder()
                    .entityType(entityType)
                    .entityId(entityId)
                    .build();
        }
        if (seoData.has("metaDescription")) {
            metadata.setMetaDescription(truncate(seoData.get("metaDescription").asText(), 200));
        }
        if (seoData.has("keywords") && seoData.get("keywords").isArray()) {
            metadata.setKeywords(objectMapper.writeValueAsString(seoData.get("keywords")));
        }
        if (seoData.has("ogDescription")) {
            metadata.setOgDescription(truncate(seoData.get("ogDescription").asText(), 300));
        }
        if (seoData.has("slug")) {
            metadata.setSlug(truncate(seoData.get("slug").asText(), 200));
        }

        seoMetadataRepository.save(metadata);
    }

    String buildProjectPrompt(Project project) {
        StringBuilder sb = new StringBuilder();

        sb.append("You are a senior SEO specialist for a Spanish youth association website.\n\n");

        sb.append("ASSOCIATION CONTEXT:\n");
        sb.append(
                "Yambo is an asociacion juvenil in Alcobendas (Madrid) focused on actividades, tiempo libre and ocio educativo for niños and adolescentes.\n");
        sb.append(
                "Main SEO priority: actividades en Alcobendas, asociacion juvenil, tiempo libre, ocio educativo.\n\n");

        sb.append("STRICT RULES:\n");
        sb.append("1. Output valid JSON only.\n");
        sb.append("2. No explanations.\n");
        sb.append("3. Do not repeat the original description literally.\n");
        sb.append("5. metaDescription max 155 characters.\n");
        sb.append("6. Always include 'Yambo' in the title.\n");
        sb.append("7. Always include 'Alcobendas (Madrid)' in metaDescription.\n");
        sb.append("8. Use action verbs like: Descubre, Participa, Únete.\n");
        sb.append("9. Focus on local SEO.\n\n");

        sb.append("PROJECT DATA:\n");
        sb.append("Name: ").append(project.getName()).append("\n");

        if (project.getSeason() != null) {
            sb.append("Season: ").append(project.getSeason()).append("\n");
        }

        if (project.getDescription() != null) {
            sb.append("Description: ").append(project.getDescription()).append("\n");
        }

        sb.append("\nReturn JSON with:\n");
        sb.append("{\n");
        sb.append("  \"metaDescription\": string,\n");
        sb.append("  \"keywords\": string[12],\n");
        sb.append("  \"ogDescription\": string,\n");
        sb.append("  \"slug\": string\n");
        sb.append("}\n");

        sb.append("\nSlug format: proyectos/{name-normalized}-{season}\n");
        sb.append("Slug must be lowercase, no accents, hyphen-separated.\n");

        return sb.toString();
    }

    static String extractJson(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }

        // Try to find JSON within markdown code blocks first
        Pattern codeBlockPattern = Pattern.compile("```(?:json)?\\s*\\n?(\\{.*?})\\s*\\n?```", Pattern.DOTALL);
        Matcher codeBlockMatcher = codeBlockPattern.matcher(text);
        if (codeBlockMatcher.find()) {
            return codeBlockMatcher.group(1).trim();
        }

        // Try to find raw JSON object
        Matcher jsonMatcher = JSON_BLOCK_PATTERN.matcher(text);
        if (jsonMatcher.find()) {
            return jsonMatcher.group().trim();
        }

        return null;
    }

    private static String truncate(String value, int maxLength) {
        if (value == null)
            return null;
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
