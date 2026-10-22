package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.LegalPage;
import es.yambo_alco.web.repository.LegalPageRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LegalPageServiceTest {

    @Mock
    private LegalPageRepository legalPageRepository;

    @InjectMocks
    private LegalPageService legalPageService;

    private LegalPage createPage(String id, String type, String title, String content, boolean published, int version) {
        return LegalPage.builder()
                .id(id)
                .type(type)
                .title(title)
                .content(content)
                .published(published)
                .version(version)
                .publishedAt(published ? LocalDateTime.now() : null)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Test
    void getPublishedPages_ShouldReturnOnlyPublishedPages() {
        List<LegalPage> expectedPages = List.of(
                createPage("1", "PRIVACY", "Privacidad", "Content", true, 1),
                createPage("2", "COOKIES", "Cookies", "Content", true, 2)
        );
        when(legalPageRepository.findByPublishedTrueOrderByType()).thenReturn(expectedPages);

        List<LegalPage> result = legalPageService.getPublishedPages();

        assertEquals(expectedPages, result);
        verify(legalPageRepository).findByPublishedTrueOrderByType();
    }

    @Test
    void getPublishedPages_WhenNonePublished_ShouldReturnEmptyList() {
        when(legalPageRepository.findByPublishedTrueOrderByType()).thenReturn(List.of());

        List<LegalPage> result = legalPageService.getPublishedPages();

        assertTrue(result.isEmpty());
        verify(legalPageRepository).findByPublishedTrueOrderByType();
    }

    @Test
    void getPublishedById_WhenExists_ShouldReturnPage() {
        LegalPage page = createPage("1", "PRIVACY", "Privacidad", "Content", true, 1);
        when(legalPageRepository.findByIdAndPublishedTrue("1")).thenReturn(Optional.of(page));

        LegalPage result = legalPageService.getPublishedById("1");

        assertEquals(page, result);
        verify(legalPageRepository).findByIdAndPublishedTrue("1");
    }

    @Test
    void getPublishedById_WhenNotFound_ShouldThrowException() {
        when(legalPageRepository.findByIdAndPublishedTrue("404")).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> legalPageService.getPublishedById("404"));

        assertTrue(exception.getMessage().contains("404"));
        verify(legalPageRepository).findByIdAndPublishedTrue("404");
    }

    @Test
    void getAllPages_ShouldReturnAllPages() {
        List<LegalPage> expectedPages = List.of(
                createPage("1", "PRIVACY", "Privacidad", "Content", true, 1),
                createPage("2", "COOKIES", "Cookies", "Content", false, 1)
        );
        when(legalPageRepository.findAllByOrderByType()).thenReturn(expectedPages);

        List<LegalPage> result = legalPageService.getAllPages();

        assertEquals(expectedPages, result);
        verify(legalPageRepository).findAllByOrderByType();
    }

    @Test
    void getById_WhenExists_ShouldReturnPage() {
        LegalPage page = createPage("1", "PRIVACY", "Privacidad", "Content", true, 1);
        when(legalPageRepository.findById("1")).thenReturn(Optional.of(page));

        LegalPage result = legalPageService.getById("1");

        assertEquals(page, result);
        verify(legalPageRepository).findById("1");
    }

    @Test
    void getById_WhenNotFound_ShouldThrowException() {
        when(legalPageRepository.findById("404")).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> legalPageService.getById("404"));

        assertTrue(exception.getMessage().contains("404"));
        verify(legalPageRepository).findById("404");
    }

    @Test
    void update_WhenPublished_ShouldSetPublishedAt() {
        LegalPage existing = LegalPage.builder()
                .id("1")
                .type("PRIVACY")
                .title("Old Title")
                .content("Old Content")
                .published(false)
                .version(1)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        when(legalPageRepository.findById("1")).thenReturn(Optional.of(existing));
        when(legalPageRepository.save(any(LegalPage.class))).thenAnswer(inv -> inv.getArgument(0));

        LegalPage result = legalPageService.update("1", "New Title", "New Content", true);

        assertEquals("New Title", result.getTitle());
        assertEquals("New Content", result.getContent());
        assertTrue(result.isPublished());
        assertEquals(2, result.getVersion());
        assertNotNull(result.getPublishedAt());
        verify(legalPageRepository).findById("1");
        verify(legalPageRepository).save(existing);
    }

    @Test
    void update_WhenNotPublished_ShouldNotSetPublishedAt() {
        LegalPage existing = LegalPage.builder()
                .id("1")
                .type("PRIVACY")
                .title("Title")
                .content("Content")
                .published(false)
                .version(1)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        when(legalPageRepository.findById("1")).thenReturn(Optional.of(existing));
        when(legalPageRepository.save(any(LegalPage.class))).thenAnswer(inv -> inv.getArgument(0));

        LegalPage result = legalPageService.update("1", "Title", "Content", false);

        assertFalse(result.isPublished());
        assertEquals(2, result.getVersion());
        assertNull(result.getPublishedAt());
        verify(legalPageRepository).findById("1");
        verify(legalPageRepository).save(existing);
    }

    @Test
    void update_WhenNotFound_ShouldThrowException() {
        when(legalPageRepository.findById("404")).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> legalPageService.update("404", "Title", "Content", true));

        assertTrue(exception.getMessage().contains("404"));
        verify(legalPageRepository).findById("404");
        verify(legalPageRepository, never()).save(any());
    }
}
