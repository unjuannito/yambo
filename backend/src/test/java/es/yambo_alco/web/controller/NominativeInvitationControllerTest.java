package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.model.NominativeInvitation;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.UserRepository;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.NominativeInvitationService;
import es.yambo_alco.web.service.UserService;
import es.yambo_alco.web.util.PermissionCheckService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@WebMvcTest(controllers = NominativeInvitationController.class)
@Import(TestSecurityConfig.class)
@SuppressWarnings("null")
class NominativeInvitationControllerTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private NominativeInvitationService nominativeInvitationService;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private PermissionCheckService permissionCheckService;

    @BeforeEach
    void setUp() {
        Mockito.when(permissionCheckService.hasPermission(Mockito.anyString(), Mockito.anyString())).thenReturn(true);
    }

    @Test
    @WithMockUser(authorities = "INVITE_USERS")
    void createInvitation_returnsCreated() throws Exception {
        User currentUser = User.builder().id("U0000001").email("test@example.com").email("testuser").name("Test User").build();
        when(authService.getCurrentUser(true)).thenReturn(currentUser);

        when(nominativeInvitationService.createInvitation(anyString(), any(), any())).thenReturn(
                NominativeInvitation.builder().id(1L).email("a@b.com").token("tok").invitedBy("U0000001").build());

        when(userRepository.findById("U0000001")).thenReturn(Optional.of(currentUser));

        mvc.perform(post("/nominative-invitations")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer test.jwt.token")
                .content("{\"email\":\"a@b.com\", \"name\":\"Test User\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    @WithMockUser(authorities = "INVITE_USERS")
        void createInvitation_WithProfiles_ShouldIncludeProfilesInResponse() throws Exception {
        // Given
        User currentUser = User.builder().id("U0000001").email("test@example.com").name("Test User").build();
        when(authService.getCurrentUser(true)).thenReturn(currentUser);

        when(nominativeInvitationService.createInvitation(anyString(), any(), any())).thenReturn(
                NominativeInvitation.builder()
                        .id(1L)
                        .email("user@example.com")
                        .token("test-token")
                        .invitedBy("U0000001")
                        .profiles(java.util.Set.of(
                                es.yambo_alco.web.model.Profile.builder().id("SOCIO").build(),
                                es.yambo_alco.web.model.Profile.builder().id("MONITOR").build()
                        ))
                        .build());

        when(userRepository.findById("U0000001")).thenReturn(Optional.of(currentUser));

        // When & Then
        mvc.perform(post("/nominative-invitations")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer test.jwt.token")
                .content("{\"email\":\"user@example.com\", \"profileIds\":[\"SOCIO\",\"MONITOR\"]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.profileIds", hasSize(2)));
    }

    @Test
    @WithMockUser(authorities = "INVITE_USERS")
    void getAllInvitations_WithValidAuthority_ShouldReturnAllInvitations() throws Exception {
        // Given
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusDays(7);

        User inviter = User.builder().id("U0000001").name("Inviter User").email("inviter@example.com").build();

        NominativeInvitation invitation1 = NominativeInvitation.builder()
                .id(1L)
                .email("user1@example.com")
                .token("token123")
                .createdAt(now)
                .expiresAt(expiresAt)
                .used(false)
                .invitedBy("U0000001")
                .build();

        NominativeInvitation invitation2 = NominativeInvitation.builder()
                .id(2L)
                .email("user2@example.com")
                .token("token456")
                .createdAt(now)
                .expiresAt(expiresAt)
                .used(true)
                .invitedBy("U0000002")
                .build();

        when(nominativeInvitationService.getInvitationsSince(any())).thenReturn(List.of(invitation1, invitation2));
        when(userRepository.findById("U0000001")).thenReturn(Optional.of(inviter));

        // When & Then
        mvc.perform(get("/nominative-invitations")
                .header("Authorization", "Bearer test.jwt.token")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].email").value("user1@example.com"))
                .andExpect(jsonPath("$[0].token").value("token123"))
                .andExpect(jsonPath("$[0].used").value(false))
                .andExpect(jsonPath("$[0].invitedBy").value("U0000001"))
                .andExpect(jsonPath("$[0].invitedByUser.email").value("inviter@example.com"))
                .andExpect(jsonPath("$[1].id").value(2))
                .andExpect(jsonPath("$[1].email").value("user2@example.com"))
                .andExpect(jsonPath("$[1].used").value(true));

        verify(nominativeInvitationService, times(1)).getInvitationsSince(any());
    }

    @Test
    @WithMockUser(authorities = "INVITE_USERS")
    void getAllInvitations_WithNoInvitations_ShouldReturnEmptyList() throws Exception {
        // Given
        when(nominativeInvitationService.getInvitationsSince(any())).thenReturn(List.of());

        // When & Then
        mvc.perform(get("/nominative-invitations")
                .header("Authorization", "Bearer test.jwt.token")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        verify(nominativeInvitationService, times(1)).getInvitationsSince(any());
    }

    @Test
    @WithMockUser(authorities = "INVITE_USERS")
    void getAllInvitations_ShouldIncludeAllInvitationFields() throws Exception {
        // Given
        LocalDateTime createdAt = LocalDateTime.of(2025, 10, 18, 10, 0);
        LocalDateTime expiresAt = LocalDateTime.of(2025, 10, 25, 10, 0);

        User inviter = User.builder().id("U0000005").name("Admin User").email("admin@example.com").build();

        NominativeInvitation invitation = NominativeInvitation.builder()
                .id(1L)
                .email("test@example.com")
                .token("test-token-123")
                .createdAt(createdAt)
                .expiresAt(expiresAt)
                .used(false)
                .invitedBy("U0000005")
                .build();

        when(nominativeInvitationService.getInvitationsSince(any())).thenReturn(List.of(invitation));
        when(userRepository.findById("U0000005")).thenReturn(Optional.of(inviter));

        // When & Then
        mvc.perform(get("/nominative-invitations")
                .header("Authorization", "Bearer test.jwt.token")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].email").value("test@example.com"))
                .andExpect(jsonPath("$[0].token").value("test-token-123"))
                .andExpect(jsonPath("$[0].createdAt").exists())
                .andExpect(jsonPath("$[0].expiresAt").exists())
                .andExpect(jsonPath("$[0].used").value(false))
                .andExpect(jsonPath("$[0].invitedBy").value("U0000005"))
                .andExpect(jsonPath("$[0].invitedByUser.id").value("U0000005"))
                .andExpect(jsonPath("$[0].invitedByUser.email").value("admin@example.com"));
    }

    @Test
    @WithMockUser(authorities = "INVITE_USERS")
    void deleteInvitation_WithValidId_ShouldReturnSuccess() throws Exception {
        // Given
        doNothing().when(nominativeInvitationService).deleteInvitation(1L);

        // When & Then
        mvc.perform(delete("/nominative-invitations/1")
                .header("Authorization", "Bearer test.jwt.token"))
                .andExpect(status().isOk())
                .andExpect(content().string("Invitation deleted successfully"));

        verify(nominativeInvitationService, times(1)).deleteInvitation(1L);
    }

    @Test
    @WithMockUser(authorities = "INVITE_USERS")
    void deleteInvitation_WithDifferentId_ShouldCallServiceWithCorrectId() throws Exception {
        // Given
        doNothing().when(nominativeInvitationService).deleteInvitation(999L);

        // When & Then
        mvc.perform(delete("/nominative-invitations/999")
                .header("Authorization", "Bearer test.jwt.token"))
                .andExpect(status().isOk())
                .andExpect(content().string("Invitation deleted successfully"));

        verify(nominativeInvitationService, times(1)).deleteInvitation(999L);
    }

    @Test
    @WithMockUser(authorities = "INVITE_USERS")
    void deleteInvitation_MultipleTimes_ShouldCallServiceEachTime() throws Exception {
        // Given
        doNothing().when(nominativeInvitationService).deleteInvitation(anyLong());

        // When & Then
        mvc.perform(delete("/nominative-invitations/1")
                .header("Authorization", "Bearer test.jwt.token"))
                .andExpect(status().isOk());

        mvc.perform(delete("/nominative-invitations/2")
                .header("Authorization", "Bearer test.jwt.token"))
                .andExpect(status().isOk());

        verify(nominativeInvitationService, times(1)).deleteInvitation(1L);
        verify(nominativeInvitationService, times(1)).deleteInvitation(2L);
    }
}
