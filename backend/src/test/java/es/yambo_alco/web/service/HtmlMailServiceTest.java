package es.yambo_alco.web.service;

import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;
import org.thymeleaf.TemplateEngine;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HtmlMailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private TemplateEngine templateEngine;

    @Mock
    private MimeMessage mimeMessage;

    @InjectMocks
    private HtmlMailService htmlMailService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(htmlMailService, "fromEmail", "noreply@yambo-alco.es");
        ReflectionTestUtils.setField(htmlMailService, "fromName", "Yambo");
        ReflectionTestUtils.setField(htmlMailService, "expirationHours", 72L);
    }

    @Test
    void sendInvitation_ShouldSendEmailSuccessfully() {
        // Given
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        when(templateEngine.process(eq("emails/invitation"), any())).thenReturn("<html>Invitation Email</html>");

        String to = "test@example.com";
        String subject = "Invitación a Yambo";
        String body = "Has sido invitado a registrarte. http://localhost:5173/register?invitation=token123";

        // When
        htmlMailService.sendInvitation(to, subject, body);

        // Then
        verify(mailSender).createMimeMessage();
        verify(templateEngine).process(eq("emails/invitation"), any());
        verify(mailSender).send(mimeMessage);
    }

    @Test
    void sendInvitation_WhenMessagingExceptionOccurs_ShouldThrowRuntimeException() {
        // Given
        when(mailSender.createMimeMessage()).thenThrow(new RuntimeException("Mail server error"));

        String to = "test@example.com";
        String subject = "Invitación a Yambo";
        String body = "Has sido invitado.";

        // When & Then
        assertThatThrownBy(() -> htmlMailService.sendInvitation(to, subject, body))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Failed to send invitation email");

        verify(mailSender).createMimeMessage();
        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    void sendInvitation_ShouldCallMailSenderOnce() {
        // Given
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        when(templateEngine.process(eq("emails/invitation"), any())).thenReturn("<html>Email</html>");

        // When
        htmlMailService.sendInvitation("user@test.com", "Subject", "Body with link http://example.com");

        // Then
        verify(mailSender, times(1)).send(mimeMessage);
        verify(templateEngine, times(1)).process(eq("emails/invitation"), any());
    }
}
