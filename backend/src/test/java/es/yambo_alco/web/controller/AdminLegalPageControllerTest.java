package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.model.LegalPage;
import es.yambo_alco.web.service.LegalPageService;
import es.yambo_alco.web.util.PermissionCheckService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AdminLegalPageController.class)
@Import(TestSecurityConfig.class)
class AdminLegalPageControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private LegalPageService legalPageService;

    @MockitoBean
    private PermissionCheckService permissionCheckService;

    @BeforeEach
    void setUp() {
        when(permissionCheckService.hasPermission(anyString(), anyString())).thenReturn(true);
    }

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
    @WithMockUser
    void listAll_ShouldReturnAllPages() throws Exception {
        List<LegalPage> pages = List.of(
                createPage("PRIVACY", "PRIVACY", "Política de Privacidad", "<p>Contenido</p>", true),
                createPage("COOKIES", "COOKIES", "Política de Cookies", "<p>Cookies</p>", false)
        );
        when(legalPageService.getAllPages()).thenReturn(pages);

        mockMvc.perform(get("/admin/legal"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value("PRIVACY"))
                .andExpect(jsonPath("$[0].title").value("Política de Privacidad"))
                .andExpect(jsonPath("$[1].id").value("COOKIES"))
                .andExpect(jsonPath("$[1].published").value(false));
    }

    @Test
    @WithMockUser
    void listAll_WhenEmpty_ShouldReturnEmptyList() throws Exception {
        when(legalPageService.getAllPages()).thenReturn(List.of());

        mockMvc.perform(get("/admin/legal"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @WithMockUser
    void getById_ShouldReturnPage() throws Exception {
        LegalPage page = createPage("PRIVACY", "PRIVACY", "Política de Privacidad", "<p>Contenido</p>", true);
        when(legalPageService.getById("PRIVACY")).thenReturn(page);

        mockMvc.perform(get("/admin/legal/PRIVACY"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("PRIVACY"))
                .andExpect(jsonPath("$.title").value("Política de Privacidad"))
                .andExpect(jsonPath("$.content").value("<p>Contenido</p>"))
                .andExpect(jsonPath("$.published").value(true))
                .andExpect(jsonPath("$.version").value(2));
    }

    @Test
    @WithMockUser
    void update_ShouldReturnUpdatedPage() throws Exception {
        LegalPage updated = createPage("PRIVACY", "PRIVACY", "Nuevo Título", "<p>Nuevo contenido</p>", true);
        when(legalPageService.update("PRIVACY", "Nuevo Título", "<p>Nuevo contenido</p>", true)).thenReturn(updated);

        String requestBody = """
                {
                    "title": "Nuevo Título",
                    "content": "<p>Nuevo contenido</p>",
                    "published": true
                }
                """;

        mockMvc.perform(put("/admin/legal/PRIVACY")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("PRIVACY"))
                .andExpect(jsonPath("$.title").value("Nuevo Título"))
                .andExpect(jsonPath("$.published").value(true));
    }

    @Test
    @WithMockUser
    void update_WithBlankTitle_ShouldReturnBadRequest() throws Exception {
        String requestBody = """
                {
                    "title": "",
                    "content": "<p>Contenido</p>",
                    "published": false
                }
                """;

        mockMvc.perform(put("/admin/legal/PRIVACY")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void update_WithBlankContent_ShouldReturnBadRequest() throws Exception {
        String requestBody = """
                {
                    "title": "Título",
                    "content": "",
                    "published": false
                }
                """;

        mockMvc.perform(put("/admin/legal/PRIVACY")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isBadRequest());
    }
}
