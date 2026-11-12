package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.model.EmailCommonElement;
import es.yambo_alco.web.repository.EmailCommonElementRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Tests de {@link EmailCommonElementService}: header/footer (built-in, no se
 * pueden borrar) + componentes que el admin crea desde la GUI (issue #123, Part 2).
 */
@ExtendWith(MockitoExtension.class)
class EmailCommonElementServiceTest {

    @Mock
    private EmailCommonElementRepository repository;

    @InjectMocks
    private EmailCommonElementService service;

    @Test
    void create_ShouldSlugifyNameIntoAStableKey() {
        when(repository.findByKey("firma-del-equipo")).thenReturn(Optional.empty());
        when(repository.save(any(EmailCommonElement.class))).thenAnswer(inv -> inv.getArgument(0));

        EmailCommonElementService.CommonElementView view =
                service.create("Firma del equipo", "<p>Un saludo, {{organizacion}}</p>", "Firma para comunicados");

        ArgumentCaptor<EmailCommonElement> captor = ArgumentCaptor.forClass(EmailCommonElement.class);
        verify(repository).save(captor.capture());
        assertEquals("firma-del-equipo", captor.getValue().getKey());
        assertFalse(view.isBuiltIn());
    }

    @Test
    void create_ShouldDisambiguateADuplicateSlug() {
        when(repository.findByKey("firma")).thenReturn(Optional.of(mock(EmailCommonElement.class)));
        when(repository.findByKey("firma-2")).thenReturn(Optional.empty());
        when(repository.save(any(EmailCommonElement.class))).thenAnswer(inv -> inv.getArgument(0));

        EmailCommonElementService.CommonElementView view = service.create("Firma", "<p>Hola</p>", null);

        assertEquals("firma-2", view.getKey());
    }

    @Test
    void create_WithBlankHtml_ShouldThrow() {
        assertThrows(BadRequestException.class, () -> service.create("Firma", "  ", null));
        verifyNoInteractions(repository);
    }

    @Test
    void delete_ShouldRemoveACustomElement() {
        EmailCommonElement element = EmailCommonElement.builder().id("ECEL0003").key("firma").name("Firma").build();
        when(repository.findByKey("firma")).thenReturn(Optional.of(element));

        service.delete("firma");

        verify(repository).delete(element);
    }

    @Test
    void delete_ShouldRejectHeaderAndFooter() {
        assertThrows(BadRequestException.class, () -> service.delete("header"));
        assertThrows(BadRequestException.class, () -> service.delete("footer"));
        verifyNoInteractions(repository);
    }

    @Test
    void list_ShouldFlagHeaderAndFooterAsBuiltIn() {
        when(repository.findAllByOrderByKeyAsc()).thenReturn(java.util.List.of(
                EmailCommonElement.builder().id("ECEL0001").key("header").name("Cabecera").html("<div></div>").build(),
                EmailCommonElement.builder().id("ECEL0003").key("firma").name("Firma").html("<p></p>").build()));

        var views = service.list();

        assertTrue(views.stream().filter(v -> v.getKey().equals("header")).findFirst().orElseThrow().isBuiltIn());
        assertFalse(views.stream().filter(v -> v.getKey().equals("firma")).findFirst().orElseThrow().isBuiltIn());
    }

    @Test
    void resetToDefault_ShouldRejectACustomElement() {
        EmailCommonElement element = EmailCommonElement.builder().id("ECEL0003").key("firma").name("Firma").build();
        when(repository.findByKey("firma")).thenReturn(Optional.of(element));

        assertThrows(BadRequestException.class, () -> service.resetToDefault("firma"));
    }
}
