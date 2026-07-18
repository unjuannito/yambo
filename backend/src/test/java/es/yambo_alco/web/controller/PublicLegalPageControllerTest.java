package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.LegalPage;
import es.yambo_alco.web.service.LegalPageService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PublicLegalPageController.class)
@Import(TestSecurityConfig.class)
class PublicLegalPageControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private LegalPageService legalPageService;

    private LegalPage createPage(String id, String type, String title, String content, boolean published) {
        return LegalPage.builder()
                .id(id)
                .type(type)
                .title(title)
                .content(content)
                .published(published)
                .version(published ? 2 : 1)
                .publishedAt(published ? LocalDateTime.of(2026, 1, 1, 10, 0) : null)
                .createdAt(LocalDateTime.of(2025, 12, 1, 10, 0))
                .updatedAt(LocalDateTime.of(2026, 1, 1, 10, 0))
                .build();
    }

    @Test
    void listPublished_ShouldReturnPublishedPages() throws Exception {
        List<LegalPage> pages = List.of(
                createPage("PRIVACY", "PRIVACY", "Política de Privacidad", "<p>Contenido</p>", true),
                createPage("COOKIES", "COOKIES", "Política de Cookies", "<p>Cookies</p>", true)
        );
        when(legalPageService.getPublishedPages()).thenReturn(pages);

        mockMvc.perform(get("/public/legal"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value("PRIVACY"))
                .andExpect(jsonPath("$[0].title").value("Política de Privacidad"))
                .andExpect(jsonPath("$[1].id").value("COOKIES"));
    }

    @Test
    void listPublished_WhenNone_ShouldReturnEmptyList() throws Exception {
        when(legalPageService.getPublishedPages()).thenReturn(List.of());

        mockMvc.perform(get("/public/legal"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void getPublished_ShouldReturnPage() throws Exception {
        LegalPage page = createPage("PRIVACY", "PRIVACY", "Política de Privacidad", "<p>Contenido</p>", true);
        when(legalPageService.getPublishedById("PRIVACY")).thenReturn(page);

        mockMvc.perform(get("/public/legal/PRIVACY"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("PRIVACY"))
                .andExpect(jsonPath("$.title").value("Política de Privacidad"))
                .andExpect(jsonPath("$.content").value("<p>Contenido</p>"))
                .andExpect(jsonPath("$.version").value(2))
                .andExpect(jsonPath("$.publishedAt").exists());
    }

    @Test
    void getPublished_WhenNotFound_ShouldReturn404() throws Exception {
        when(legalPageService.getPublishedById("404")).thenThrow(new ResourceNotFoundException("Página legal no encontrada: 404"));

        mockMvc.perform(get("/public/legal/404"))
                .andExpect(status().isNotFound());
    }
}
