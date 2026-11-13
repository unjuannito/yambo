package es.yambo_alco.web.service;

import es.yambo_alco.web.util.CampaignVariables;
import org.junit.jupiter.api.Test;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.mockito.ArgumentCaptor;
import java.time.LocalDateTime;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CampaignPersonalizationTest {
    private static final LocalDateTime WHEN = LocalDateTime.of(2026,11,13,10,35);

    @Test
    void rendersEachRecipientInBodySubjectAndSharedHeaderWithoutLeakingOthers() {
        var settings = mock(SettingsService.class);
        when(settings.getOrganizationName()).thenReturn("Yambo");
        when(settings.getDomain()).thenReturn("https://yambo.example");
        var repository = mock(es.yambo_alco.web.repository.EmailCommonElementRepository.class);
        when(repository.findByKey(anyString())).thenReturn(Optional.empty());
        var executor = new ThreadPoolTaskExecutor(); executor.setCorePoolSize(1); executor.initialize();
        try {
            var renderer = new EmailRenderer(settings, new ThymeleafEmailEngine(executor), repository);
            var mail = mock(MailService.class);
            var sender = new CampaignSender(mail, renderer);
            String body = "<p>Hola {{nombre}}, email ${email}.</p><p th:text=\"${destinatario.nombre}\"></p><p>Usuario {{usuario}} · {{fecha}}</p>";
            sender.sendAll("Hola ${nombre} · {{usuario}}", body, List.of(
                    new CampaignRecipient("U1","Ana","ana@example.com"), new CampaignRecipient("U2","Bruno","bruno@example.com")));
            var to = ArgumentCaptor.forClass(String.class); var subjects = ArgumentCaptor.forClass(String.class); var html = ArgumentCaptor.forClass(String.class);
            verify(mail,times(2)).sendRaw(to.capture(),subjects.capture(),html.capture());
            assertEquals(List.of("ana@example.com","bruno@example.com"),to.getAllValues());
            assertEquals("Hola Ana · ana@example.com",subjects.getAllValues().get(0));
            assertEquals("Hola Bruno · bruno@example.com",subjects.getAllValues().get(1));
            assertTrue(html.getAllValues().get(0).contains("Hola Ana"));
            assertTrue(html.getAllValues().get(0).contains(">Ana</p>"));
            assertFalse(html.getAllValues().get(0).contains("bruno@example.com"));
            assertFalse(html.getAllValues().get(1).contains("ana@example.com"));
        } finally { executor.shutdown(); }
    }

    @Test
    void resolvesDatesAndNestedValuesAndEscapesPersonalText() {
        var values = CampaignVariables.values(new CampaignRecipient("U1", "Ana <b>& {{email}}", "ana@example.com"),"Yambo","https://yambo.example",WHEN);
        assertEquals("13/11/2026",values.get("fecha")); assertEquals("10:35",values.get("hora")); assertEquals(2026,values.get("anio"));
        assertEquals("ana@example.com",CampaignVariables.replace("${destinatario.email}",values));
        String html = CampaignVariables.resolveHtml("<p>{{nombre}}</p><a href='{{preferencesUrl}}'>Cuenta</a>",values);
        assertTrue(html.contains("&lt;b&gt;")); assertTrue(html.contains("&amp;"));
        assertTrue(html.contains("{{email}}"),"Replacement values are never processed recursively");
        assertTrue(html.contains("https://yambo.example/mi-espacio/cuenta"));
        assertEquals("Ana <b>& {{email}}",CampaignVariables.replace("{{nombre}}",values));
        assertTrue(CampaignVariables.catalog(values).stream().anyMatch(v -> v.varName().equals("destinatario") && v.sample() instanceof Map));
    }

    @Test
    void senderContinuesAfterOneDeliveryFails() {
        var renderer = mock(EmailRenderer.class); var mail = mock(MailService.class);
        when(renderer.campaignVariables(any(),any())).thenReturn(Map.of("nombre","Ejemplo"));
        when(renderer.renderCampaignBody(anyString(),anyMap())).thenReturn("<p>Hola</p>");
        when(renderer.renderCampaignSubject(anyString(),anyMap())).thenReturn("Asunto");
        doThrow(new IllegalStateException("Test failure")).when(mail).sendRaw(eq("first@example.com"),anyString(),anyString());
        new CampaignSender(mail,renderer).sendAll("Asunto","Cuerpo",List.of(new CampaignRecipient("1","Uno","first@example.com"),new CampaignRecipient("2","Dos","second@example.com")));
        verify(mail).sendRaw(eq("second@example.com"),eq("Asunto"),eq("<p>Hola</p>"));
    }
}
