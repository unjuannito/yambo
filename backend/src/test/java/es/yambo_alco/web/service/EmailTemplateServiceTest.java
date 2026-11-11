package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.model.EmailTemplate;
import es.yambo_alco.web.repository.EmailTemplateRepository;
import es.yambo_alco.web.util.EmailTemplateCatalog;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.IContext;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Tests de {@link EmailTemplateService}: CRUD de personalización de correos
 * automáticos, vista previa y correo de prueba.
 */
@ExtendWith(MockitoExtension.class)
class EmailTemplateServiceTest {

    @Mock
    private EmailTemplateRepository templateRepository;

    @Mock
    private EmailRenderer emailRenderer;

    @Mock
    private MailService mailService;

    @Mock
    private TemplateEngine templateEngine;

    @InjectMocks
    private EmailTemplateService service;

    private EmailTemplate overrideRow(String key, String subject, String body) {
        return EmailTemplate.builder().key(key).subject(subject).body(body).updatedBy("admin").build();
    }

    @Test
    void listTemplates_ShouldReturnOneViewPerCatalogEntry() {
        when(templateRepository.findByKey(anyString())).thenReturn(Optional.empty());

        List<EmailTemplateService.TemplateView> views = service.listTemplates();

        assertEquals(EmailTemplateCatalog.all().size(), views.size());
        views.forEach(v -> assertFalse(v.isOverridden()));
    }

    @Test
    void listTemplates_ShouldFlagOverridden() {
        String key = "invitation";
        when(templateRepository.findByKey(anyString()))
                .thenAnswer(inv -> inv.getArgument(0).equals(key)
                        ? Optional.of(overrideRow(key, "Sujeto", "Cuerpo"))
                        : Optional.empty());

        List<EmailTemplateService.TemplateView> views = service.listTemplates();
        EmailTemplateService.TemplateView invitation =
                views.stream().filter(v -> v.getKey().equals(key)).findFirst().orElseThrow();

        assertTrue(invitation.isOverridden());
        assertEquals("Sujeto", invitation.getSubject());
        assertEquals("Cuerpo", invitation.getBody());
    }

    @Test
    void getTemplate_WithUnknownKey_ShouldThrow() {
        assertThrows(BadRequestException.class, () -> service.getTemplate("no-existe"));
    }

    @Test
    void save_WithBody_ShouldPersistAndReturnOverridden() {
        when(templateRepository.findByKey("invitation")).thenReturn(Optional.empty());
        when(templateRepository.save(any(EmailTemplate.class))).thenAnswer(inv -> inv.getArgument(0));

        EmailTemplateService.TemplateView view =
                service.save("invitation", "Hola {{nombre}}", "Bienvenido {{nombre}}", "admin");

        ArgumentCaptor<EmailTemplate> captor = ArgumentCaptor.forClass(EmailTemplate.class);
        verify(templateRepository).save(captor.capture());
        EmailTemplate saved = captor.getValue();
        assertEquals("invitation", saved.getKey());
        assertEquals("Hola {{nombre}}", saved.getSubject());
        assertEquals("Bienvenido {{nombre}}", saved.getBody());
        assertEquals("admin", saved.getUpdatedBy());

        assertTrue(view.isOverridden());
        assertEquals("Bienvenido {{nombre}}", view.getBody());
    }

    @Test
    void save_WithBlankBody_ShouldRemoveExistingOverride() {
        EmailTemplate existing = overrideRow("invitation", "Sujeto", "Cuerpo");
        when(templateRepository.findByKey("invitation")).thenReturn(Optional.of(existing));

        EmailTemplateService.TemplateView view = service.save("invitation", "  ", "   ", "admin");

        verify(templateRepository).delete(existing);
        verify(templateRepository, never()).save(any());
        assertFalse(view.isOverridden());
        assertNull(view.getBody());
    }

    @Test
    void save_WithUnknownKey_ShouldThrow() {
        assertThrows(BadRequestException.class,
                () -> service.save("no-existe", "s", "b", "admin"));
    }

    @Test
    void reset_ShouldDeleteOverrideAndReturnNotOverridden() {
        EmailTemplate existing = overrideRow("invitation", "Sujeto", "Cuerpo");
        when(templateRepository.findByKey("invitation")).thenReturn(Optional.of(existing));

        EmailTemplateService.TemplateView view = service.reset("invitation");

        verify(templateRepository).delete(existing);
        assertFalse(view.isOverridden());
    }

    @Test
    void preview_WithBody_ShouldUseRenderer() {
        when(emailRenderer.brandVariables()).thenReturn(Map.of());
        when(emailRenderer.renderBody(eq("invitation"), anyString(), any()))
                .thenReturn("<p>rendered</p>");
        when(templateEngine.process(eq("emails/layout/base-email"), any(IContext.class)))
                .thenReturn("<html><body><p>rendered</p></body></html>");

        String html = service.preview("invitation", "Hola {{nombre}}");

        assertEquals("<html><body><p>rendered</p></body></html>", html);
    }

    @Test
    void preview_WithBlankBody_ShouldReturnDefaultNote() {
        when(emailRenderer.brandVariables()).thenReturn(Map.of());
        when(templateEngine.process(eq("emails/layout/base-email"), any(IContext.class)))
                .thenReturn("<html>default</html>");

        String html = service.preview("invitation", "");

        assertEquals("<html>default</html>", html);
        verify(emailRenderer, never()).renderBody(anyString(), anyString(), any());
    }

    @Test
    void sendTest_WithBody_ShouldSendRawWithRenderedContent() {
        when(emailRenderer.brandVariables()).thenReturn(Map.of());
        when(emailRenderer.renderBody(eq("invitation"), anyString(), any()))
                .thenReturn("<p>rendered</p>");
        when(templateEngine.process(eq("emails/layout/base-email"), any(IContext.class)))
                .thenReturn("<html>full</html>");

        service.sendTest("invitation", null, "Hola {{nombre}}", "test@example.com");

        // Sin asunto personalizado → el asunto por defecto usa el nombre de la
        // plantilla del catálogo.
        verify(mailService).sendRaw(eq("test@example.com"),
                eq("[" + EmailTemplateCatalog.byKey("invitation").displayName() + "]"),
                eq("<html>full</html>"));
    }

    @Test
    void sendTest_WithCustomSubject_ShouldUseRenderedSubject() {
        when(emailRenderer.brandVariables()).thenReturn(Map.of());
        when(emailRenderer.renderBody(eq("invitation"), anyString(), any()))
                .thenReturn("<p>rendered</p>");
        when(templateEngine.process(eq("emails/layout/base-email"), any(IContext.class)))
                .thenReturn("<html>full</html>");
        when(emailRenderer.renderSubject(anyString(), anyString(), any()))
                .thenReturn("Hola {{nombre}}");

        service.sendTest("invitation", "Hola {{nombre}}", "Cuerpo", "test@example.com");

        verify(mailService).sendRaw(eq("test@example.com"), eq("Hola {{nombre}}"), anyString());
    }

    @Test
    void sendTest_WithInvalidAddress_ShouldThrow() {
        assertThrows(BadRequestException.class,
                () -> service.sendTest("invitation", null, "cuerpo", "no-es-un-email"));
        verifyNoInteractions(mailService);
    }
}
