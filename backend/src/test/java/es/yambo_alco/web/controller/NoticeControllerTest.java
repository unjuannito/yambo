package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.model.Notice;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.NoticeService;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = NoticeController.class)
@Import(TestSecurityConfig.class)
class NoticeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private NoticeService noticeService;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private PermissionCheckService permissionCheckService;

    @BeforeEach
    void setUp() {
        when(permissionCheckService.hasPermission(anyString(), anyString())).thenReturn(true);
        when(authService.getCurrentUser(true)).thenReturn(
                User.builder().id("UADMIN01").name("System Administrator").email("admin@yambo.com").build());
    }

    private Notice notice(String id, String title, boolean pinned, boolean isPublic) {
        return Notice.builder()
                .id(id)
                .title(title)
                .content("<p>Contenido</p>")
                .slug("aviso-" + id.toLowerCase())
                .pinned(pinned)
                .isPublic(isPublic)
                .publishedAt(LocalDateTime.of(2026, 1, 1, 10, 0))
                .createdBy("System Administrator")
                .createdAt(LocalDateTime.of(2026, 1, 1, 10, 0))
                .updatedAt(LocalDateTime.of(2026, 1, 1, 10, 0))
                .build();
    }

    @Test
    @WithMockUser
    void listActive_ShouldReturnActiveNotices() throws Exception {
        when(noticeService.getActive()).thenReturn(List.of(notice("NOTI0001", "Primer aviso", true, false)));

        mockMvc.perform(get("/notices/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("Primer aviso"));
    }

    @Test
    @WithMockUser
    void listAll_ShouldReturnAllNotices() throws Exception {
        when(noticeService.getAll()).thenReturn(List.of(
                notice("NOTI0001", "Fijado", true, true),
                notice("NOTI0002", "Normal", false, false)));

        mockMvc.perform(get("/notices"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].pinned").value(true))
                .andExpect(jsonPath("$[1].public").value(false));
    }

    @Test
    @WithMockUser
    void create_ShouldReturnCreatedNotice() throws Exception {
        when(noticeService.create(eq("Nuevo aviso"), eq("<p>Hola</p>"), any(), eq(true), eq(true), any(), eq("System Administrator")))
                .thenReturn(notice("NOTI0003", "Nuevo aviso", true, true));

        String requestBody = """
                {
                    "title": "Nuevo aviso",
                    "content": "<p>Hola</p>",
                    "pinned": true,
                    "isPublic": true
                }
                """;

        mockMvc.perform(post("/notices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("NOTI0003"))
                .andExpect(jsonPath("$.title").value("Nuevo aviso"));
    }

    @Test
    @WithMockUser
    void create_WithBlankTitle_ShouldReturnBadRequest() throws Exception {
        String requestBody = """
                {
                    "title": "",
                    "content": "<p>Hola</p>"
                }
                """;

        mockMvc.perform(post("/notices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void update_ShouldReturnUpdatedNotice() throws Exception {
        when(noticeService.update(eq("NOTI0001"), eq("Título actualizado"), eq("<p>Hola</p>"), any(), eq(false), eq(false), any()))
                .thenReturn(notice("NOTI0001", "Título actualizado", false, false));

        String requestBody = """
                {
                    "title": "Título actualizado",
                    "content": "<p>Hola</p>",
                    "pinned": false,
                    "isPublic": false
                }
                """;

        mockMvc.perform(put("/notices/NOTI0001")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Título actualizado"));
    }

    @Test
    @WithMockUser
    void delete_ShouldReturnNoContent() throws Exception {
        mockMvc.perform(delete("/notices/NOTI0001"))
                .andExpect(status().isNoContent());

        verify(noticeService).delete("NOTI0001");
    }
}
