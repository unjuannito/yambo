package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.model.Invitation;
import es.yambo_alco.web.service.InvitationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AdminInvitationController.class)
@Import(TestSecurityConfig.class)
class AdminInvitationControllerTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private InvitationService invitationService;

    @Test
    @WithMockUser(authorities = "INVITE_USERS")
    void createInvitation_returnsCreated() throws Exception {
        when(invitationService.createInvitation(anyString(), any())).thenReturn(
                Invitation.builder().id(1L).email("a@b.com").token("tok").build());

        mvc.perform(post("/admin/invitations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"a@b.com\"}"))
                .andExpect(status().isCreated());
    }
}
