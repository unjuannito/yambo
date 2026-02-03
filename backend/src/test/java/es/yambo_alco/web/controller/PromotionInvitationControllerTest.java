package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.model.PromotionInvitation;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.PromotionInvitationService;
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
import java.util.Set;

import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PromotionInvitationController.class)
@Import(TestSecurityConfig.class)
@SuppressWarnings("null")
class PromotionInvitationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PromotionInvitationService promotionInvitationService;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private PermissionCheckService permissionCheckService;

    @BeforeEach
    void setUp() {
        when(permissionCheckService.hasPermission(anyString(), anyString())).thenReturn(true);
    }

    @Test
    @WithMockUser
    void createPromotionInvitation_ReturnsCreated() throws Exception {
        User user = User.builder().id("USER1").build();
        PromotionInvitation invitation = PromotionInvitation.builder()
                .id(1L)
                .token("tok")
                .createdAt(LocalDateTime.now())
                .startTms(LocalDateTime.now())
                .expiresAt(null)
                .invitedBy("USER1")
            .profiles(Set.of(Profile.builder().id("BASIC").build()))
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(promotionInvitationService.createPromotionInvitation(anyString(), any(), any(), any())).thenReturn(invitation);

        String payload = """
                {
                "profileIds": ["BASIC"],
            "startTms": "2026-02-01T09:00:00"
                }
                """;

        mockMvc.perform(post("/promotion-invitations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").value("tok"))
                .andExpect(jsonPath("$.profileIds[0]").value("BASIC"))
                .andExpect(jsonPath("$.expiresAt").value(nullValue()));
    }

    @Test
    void acceptPromotionInvitation_Anonymous_ReturnsUserInfo() throws Exception {
        User user = User.builder().id("U1").email("a@b.com").name("Name").build();
        when(authService.getCurrentUser(false)).thenReturn(null);
        when(promotionInvitationService.acceptInvitation(anyString(), any(), any(), any(), any())).thenReturn(user);

        String payload = """
                {
                    "email": "a@b.com",
                    "password": "pass",
                    "name": "Name"
                }
                """;

        mockMvc.perform(post("/promotion-invitations/tok/accept")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value("U1"))
                .andExpect(jsonPath("$.email").value("a@b.com"));
    }

    @Test
    @WithMockUser
    void listPromotionInvitations_ReturnsInvitations() throws Exception {
        PromotionInvitation invitation = PromotionInvitation.builder()
                .id(2L)
                .token("tok2")
                .createdAt(LocalDateTime.now())
                .startTms(LocalDateTime.now())
                .expiresAt(null)
            .profiles(Set.of(Profile.builder().id("BASIC").build()))
                .build();

        when(promotionInvitationService.getAllInvitations()).thenReturn(java.util.List.of(invitation));

        mockMvc.perform(get("/promotion-invitations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].token").value("tok2"))
            .andExpect(jsonPath("$[0].profileIds[0]").value("BASIC"))
            .andExpect(jsonPath("$[0].expiresAt").value(nullValue()));
    }

        @Test
        @WithMockUser
        void disablePromotionInvitation_ReturnsUpdated() throws Exception {
        PromotionInvitation invitation = PromotionInvitation.builder()
            .id(3L)
            .token("tok3")
            .createdAt(LocalDateTime.now())
            .startTms(LocalDateTime.now().minusDays(1))
            .expiresAt(LocalDateTime.now())
            .profiles(Set.of(Profile.builder().id("BASIC").build()))
            .build();

        when(promotionInvitationService.disableInvitation(3L)).thenReturn(invitation);

        mockMvc.perform(put("/promotion-invitations/3/disable"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").value("tok3"))
            .andExpect(jsonPath("$.expiresAt").value(notNullValue()));
        }
}
