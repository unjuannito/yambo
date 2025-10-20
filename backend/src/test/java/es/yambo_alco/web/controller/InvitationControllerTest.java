package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.model.Invitation;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.InvitationService;
import es.yambo_alco.web.service.UserService;

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

@WebMvcTest(controllers = InvitationController.class)
@Import(TestSecurityConfig.class)
class InvitationControllerTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private InvitationService invitationService;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private UserService userService;

    @Test
    @WithMockUser(authorities = "INVITE_USERS")
    void createInvitation_returnsCreated() throws Exception {
        when(authService.getCurrentUser(true)).thenReturn(
                User.builder().id(1L).email("test@example.com").build());

        when(invitationService.createInvitation(anyString(), anyString(), any())).thenReturn(
                Invitation.builder().id(1L).email("a@b.com").token("tok").build());


        mvc.perform(post("/invitations")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer test.jwt.token")
                .content("{\"email\":\"a@b.com\", \"name\":\"Test User\"}"))
                .andExpect(status().isCreated());
    }
}
