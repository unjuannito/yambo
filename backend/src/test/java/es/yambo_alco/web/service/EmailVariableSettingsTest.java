package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.model.Settings;
import es.yambo_alco.web.repository.SettingsRepository;
import org.junit.jupiter.api.Test;
import java.util.Map;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class EmailVariableSettingsTest {
    @Test
    void persistsOverridesInSettingsAndCanReturnToDefaults() {
        var repository = mock(SettingsRepository.class);
        var settings = new SettingsService(repository);
        var stored = Settings.builder().key("emails.variables.invitation").value("{}").build();
        when(repository.findByKey(stored.getKey())).thenReturn(Optional.of(stored));
        settings.saveEmailVariables("invitation", Map.of("headerTitle", "Bienvenido", "headerColor", "#123456", "emailDate", ""));
        assertEquals(Map.of("headerTitle", "Bienvenido", "headerColor", "#123456"), settings.getEmailVariables("invitation"));
        settings.saveEmailVariables("invitation", Map.of());
        assertTrue(settings.getEmailVariables("invitation").isEmpty());
    }

    @Test
    void refusesUnknownVariablesAndInvalidColorsWithoutWriting() {
        var repository = mock(SettingsRepository.class);
        var settings = new SettingsService(repository);
        assertThrows(BadRequestException.class, () -> settings.saveEmailVariables("invitation", Map.of("email", "other@example.com")));
        assertThrows(BadRequestException.class, () -> settings.saveEmailVariables("invitation", Map.of("headerColor", "red;display:none")));
        assertThrows(BadRequestException.class, () -> settings.saveEmailVariables("invitation", Map.of("emailDate", "31/02/2026 10:00")));
        verifyNoInteractions(repository);
    }
}
