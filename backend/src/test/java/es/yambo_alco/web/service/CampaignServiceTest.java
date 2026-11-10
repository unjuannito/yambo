package es.yambo_alco.web.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import es.yambo_alco.web.config.MailConfig;
import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.model.EmailCampaign;
import es.yambo_alco.web.model.NotificationPreferences;
import es.yambo_alco.web.model.ProjectGroup;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.CampaignAudience;
import es.yambo_alco.web.repository.EmailCampaignRepository;
import es.yambo_alco.web.repository.ProjectGroupRepository;
import es.yambo_alco.web.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Tests de {@link CampaignService}: resolución de audiencia, opt-out y
 * máquina de estados del envío.
 */
@ExtendWith(MockitoExtension.class)
class CampaignServiceTest {

    @Mock
    private EmailCampaignRepository campaignRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ProjectGroupRepository projectGroupRepository;
    @Mock
    private EmailRenderer emailRenderer;
    @Mock
    private CampaignSender campaignSender;
    @Mock
    private MailConfig mailConfig;

    @InjectMocks
    private CampaignService service;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private User user(String id, String email, Boolean receiveCampaigns) {
        User u = User.builder().id(id).name("Nombre " + id).email(email).build();
        if (receiveCampaigns != null) {
            u.setNotificationPreferences(NotificationPreferences.builder()
                    .receiveCampaigns(receiveCampaigns).build());
        }
        return u;
    }

    private EmailCampaign campaign(String id, CampaignAudience type, String ref,
                                   List<String> users, String status) {
        EmailCampaign c = EmailCampaign.builder()
                .id(id).subject("Asunto").body("Cuerpo")
                .audienceType(type).audienceRef(ref)
                .audienceUsersJson(users == null ? null : MAPPER.valueToTree(users).toString())
                .status(status)
                .build();
        c.setSentAt(LocalDateTime.now());
        return c;
    }

    private void stubFind(String id, EmailCampaign c) {
        when(campaignRepository.findById(id)).thenReturn(Optional.of(c));
    }

    private void stubSave() {
        when(campaignRepository.save(any(EmailCampaign.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    // ── create ──────────────────────────────────────────────────────────

    @Test
    void create_ShouldPersistDraft() {
        stubSave();

        CampaignService.CampaignView view =
                service.create("Asunto", "Cuerpo", CampaignAudience.ALL, null, null, "admin");

        assertEquals("DRAFT", view.getStatus());
        assertEquals("admin", view.getSentBy());
        assertEquals(CampaignAudience.ALL, view.getAudienceType());
    }

    @Test
    void create_WithBlankSubject_ShouldThrow() {
        assertThrows(BadRequestException.class,
                () -> service.create("  ", "Cuerpo", CampaignAudience.ALL, null, null, "admin"));
    }

    @Test
    void create_GroupWithoutRef_ShouldThrow() {
        assertThrows(BadRequestException.class,
                () -> service.create("Asunto", "Cuerpo", CampaignAudience.GROUP, null, null, "admin"));
    }

    @Test
    void create_UsersWithoutMembers_ShouldThrow() {
        assertThrows(BadRequestException.class,
                () -> service.create("Asunto", "Cuerpo", CampaignAudience.USERS, null, List.of(), "admin"));
    }

    // ── resolveRecipients / previewRecipients ───────────────────────────

    @Test
    void previewRecipients_All_ShouldReturnOptedInMembers() {
        stubFind("C1", campaign("C1", CampaignAudience.ALL, null, null, "DRAFT"));
        when(userRepository.findEnabledWithEmail()).thenReturn(List.of(
                user("U1", "a@x.com", null),
                user("U2", "b@x.com", true),
                user("U3", "c@x.com", false),
                user("U4", null, null)));

        CampaignService.RecipientSummary summary = service.previewRecipients("C1");

        assertEquals(2, summary.getCount());
        assertTrue(summary.getEmails().contains("a@x.com"));
        assertTrue(summary.getEmails().contains("b@x.com"));
        assertFalse(summary.getEmails().contains("c@x.com"), "el que optó fuera se filtra");
        assertFalse(summary.getEmails().contains("null"), "sin email se descarta");
    }

    @Test
    void previewRecipients_Users_ShouldResolveByIdsAndFilterOptOut() {
        stubFind("C1", campaign("C1", CampaignAudience.USERS, null, List.of("U1", "U2"), "DRAFT"));
        when(userRepository.findByIdIn(any())).thenReturn(List.of(
                user("U1", "a@x.com", null),
                user("U2", "b@x.com", false)));

        CampaignService.RecipientSummary summary = service.previewRecipients("C1");

        assertEquals(1, summary.getCount());
        assertEquals("a@x.com", summary.getEmails().get(0));
    }

    @Test
    void previewRecipients_Project_ShouldUseItsGroups() {
        stubFind("C1", campaign("C1", CampaignAudience.PROJECT, "PRJ1", null, "DRAFT"));
        when(projectGroupRepository.findByProjectId("PRJ1")).thenReturn(List.of(
                ProjectGroup.builder().id("G1").build(),
                ProjectGroup.builder().id("G2").build()));
        when(userRepository.findGroupMembersWithEmail("G1")).thenReturn(List.of(user("U1", "a@x.com", null)));
        when(userRepository.findGroupMembersWithEmail("G2")).thenReturn(List.of(user("U2", "b@x.com", null)));

        CampaignService.RecipientSummary summary = service.previewRecipients("C1");

        assertEquals(2, summary.getCount());
        verify(userRepository).findGroupMembersWithEmail("G1");
        verify(userRepository).findGroupMembersWithEmail("G2");
    }

    @Test
    void previewRecipients_Empty_ShouldReturnZero() {
        stubFind("C1", campaign("C1", CampaignAudience.ALL, null, null, "DRAFT"));
        when(userRepository.findEnabledWithEmail()).thenReturn(List.of());

        assertEquals(0, service.previewRecipients("C1").getCount());
    }

    // ── send ────────────────────────────────────────────────────────────

    @Test
    void send_Confirmed_ShouldMarkSentAndQueueSender() {
        stubFind("C1", campaign("C1", CampaignAudience.ALL, null, null, "DRAFT"));
        when(userRepository.findEnabledWithEmail()).thenReturn(List.of(user("U1", "a@x.com", null)));
        when(emailRenderer.renderCampaignBody("Cuerpo")).thenReturn("<html>doc</html>");
        when(mailConfig.isConfigured()).thenReturn(true);
        stubSave();

        CampaignService.RecipientSummary summary = service.send("C1", "admin");

        assertEquals(1, summary.getCount());
        EmailCampaign c = campaignRepository.findById("C1").get();
        assertEquals("SENT", c.getStatus());
        assertEquals(1, c.getRecipientCount());
        assertEquals("admin", c.getSentBy());
        assertNotNull(c.getSentAt());
        verify(campaignSender).sendAll(eq("Asunto"), eq("<html>doc</html>"), any());
    }

    @Test
    void send_UnconfiguredMail_ShouldStillMarkSent() {
        stubFind("C1", campaign("C1", CampaignAudience.ALL, null, null, "DRAFT"));
        when(userRepository.findEnabledWithEmail()).thenReturn(List.of(user("U1", "a@x.com", null)));
        when(emailRenderer.renderCampaignBody("Cuerpo")).thenReturn("<html>doc</html>");
        when(mailConfig.isConfigured()).thenReturn(false);
        stubSave();

        service.send("C1", "admin");

        assertEquals("SENT", campaignRepository.findById("C1").get().getStatus());
        verify(campaignSender, never()).sendAll(anyString(), anyString(), any());
    }

    @Test
    void send_AlreadySent_ShouldThrow() {
        stubFind("C1", campaign("C1", CampaignAudience.ALL, null, null, "SENT"));

        assertThrows(BadRequestException.class, () -> service.send("C1", "admin"));
        verify(campaignSender, never()).sendAll(anyString(), anyString(), any());
    }

    @Test
    void send_NoRecipients_ShouldThrowAndNotMarkSent() {
        stubFind("C1", campaign("C1", CampaignAudience.ALL, null, null, "DRAFT"));
        when(userRepository.findEnabledWithEmail()).thenReturn(List.of());

        assertThrows(BadRequestException.class, () -> service.send("C1", "admin"));

        assertEquals("DRAFT", campaignRepository.findById("C1").get().getStatus(),
                "sin destinatarios no pasa a SENT");
        verify(campaignSender, never()).sendAll(anyString(), anyString(), any());
    }

    // ── update / delete ─────────────────────────────────────────────────

    @Test
    void update_Draft_ShouldApplyChanges() {
        stubFind("C1", campaign("C1", CampaignAudience.ALL, null, null, "DRAFT"));
        stubSave();

        CampaignService.CampaignView view =
                service.update("C1", "Nuevo asunto", "Nuevo cuerpo", null, null, null, "admin");

        assertEquals("Nuevo asunto", view.getSubject());
        assertEquals("Nuevo cuerpo", view.getBody());
    }

    @Test
    void update_Sent_ShouldThrow() {
        stubFind("C1", campaign("C1", CampaignAudience.ALL, null, null, "SENT"));

        assertThrows(BadRequestException.class,
                () -> service.update("C1", "x", "y", null, null, null, "admin"));
    }

    @Test
    void delete_Draft_ShouldDelete() {
        EmailCampaign c = campaign("C1", CampaignAudience.ALL, null, null, "DRAFT");
        when(campaignRepository.findById("C1")).thenReturn(Optional.of(c));

        service.delete("C1");

        verify(campaignRepository).delete(c);
    }

    @Test
    void delete_Sent_ShouldThrow() {
        EmailCampaign c = campaign("C1", CampaignAudience.ALL, null, null, "SENT");
        when(campaignRepository.findById("C1")).thenReturn(Optional.of(c));

        assertThrows(BadRequestException.class, () -> service.delete("C1"));
        verify(campaignRepository, never()).delete(any());
    }
}
