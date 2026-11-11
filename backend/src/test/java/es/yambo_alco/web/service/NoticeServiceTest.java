package es.yambo_alco.web.service;

import es.yambo_alco.web.model.Notice;
import es.yambo_alco.web.model.NotificationPreferences;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.NoticeRepository;
import es.yambo_alco.web.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NoticeServiceTest {

    @Mock
    private NoticeRepository noticeRepository;
    @Mock
    private SlugService slugService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private UserService userService;
    @Mock
    private MailService mailService;
    @Mock
    private SettingsService settingsService;

    @InjectMocks
    private NoticeService noticeService;

    private User subscribed;
    private User unsubscribed;

    @BeforeEach
    void setUp() {
        lenient().when(slugService.forNotice(anyString())).thenReturn("nuevo-anuncio");
        lenient().when(noticeRepository.save(any(Notice.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(settingsService.getDomain()).thenReturn("https://yambo-alco.es");

        subscribed = User.builder().id("U0001").name("Ana").email("ana@test.com").build();
        unsubscribed = User.builder().id("U0002").name("Bob").email("bob@test.com").build();
    }

    @Test
    void create_NotifiesOnlyMembersWithTheNoticePreferenceEnabled() {
        when(userRepository.findByEnabledTrueAndHasAccountTrueAndSystemFalse())
                .thenReturn(List.of(subscribed, unsubscribed));
        when(userService.getNotificationPreferences("U0001"))
                .thenReturn(NotificationPreferences.builder().noticePublished(true).build());
        when(userService.getNotificationPreferences("U0002"))
                .thenReturn(NotificationPreferences.builder().noticePublished(false).build());

        noticeService.create("Nuevo anuncio", "<p>Hola</p>", null, false, true, null, "UADMIN01");

        verify(mailService).sendNoticePublished(
                eq("ana@test.com"), eq("Ana"), eq("Nuevo anuncio"), eq("<p>Hola</p>"), any(), anyString());
        verify(mailService, never()).sendNoticePublished(
                eq("bob@test.com"), anyString(), anyString(), anyString(), any(), anyString());
    }

    @Test
    void create_LinksToThePublicPageWhenTheNoticeIsPublic() {
        when(userRepository.findByEnabledTrueAndHasAccountTrueAndSystemFalse()).thenReturn(List.of(subscribed));
        when(userService.getNotificationPreferences("U0001"))
                .thenReturn(NotificationPreferences.builder().noticePublished(true).build());

        noticeService.create("Nuevo anuncio", "<p>Hola</p>", null, false, true, null, "UADMIN01");

        ArgumentCaptor<String> linkCaptor = ArgumentCaptor.forClass(String.class);
        verify(mailService).sendNoticePublished(anyString(), anyString(), anyString(), anyString(), any(), linkCaptor.capture());
        assertEquals("https://yambo-alco.es/anuncios/nuevo-anuncio", linkCaptor.getValue());
    }

    @Test
    void create_LinksToTheDashboardWhenTheNoticeIsNotPublic() {
        when(userRepository.findByEnabledTrueAndHasAccountTrueAndSystemFalse()).thenReturn(List.of(subscribed));
        when(userService.getNotificationPreferences("U0001"))
                .thenReturn(NotificationPreferences.builder().noticePublished(true).build());

        noticeService.create("Nuevo anuncio", "<p>Hola</p>", null, false, false, null, "UADMIN01");

        ArgumentCaptor<String> linkCaptor = ArgumentCaptor.forClass(String.class);
        verify(mailService).sendNoticePublished(anyString(), anyString(), anyString(), anyString(), any(), linkCaptor.capture());
        assertEquals("https://yambo-alco.es/mi-espacio", linkCaptor.getValue());
    }

    @Test
    void create_StillSavesTheNoticeIfDispatchingEmailsFails() {
        when(userRepository.findByEnabledTrueAndHasAccountTrueAndSystemFalse())
                .thenThrow(new RuntimeException("boom"));

        Notice result = noticeService.create("Nuevo anuncio", "<p>Hola</p>", null, false, true, null, "UADMIN01");

        assertEquals("Nuevo anuncio", result.getTitle());
        verify(noticeRepository).save(any(Notice.class));
    }
}
