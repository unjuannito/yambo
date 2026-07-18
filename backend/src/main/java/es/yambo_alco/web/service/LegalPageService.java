package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.LegalPage;
import es.yambo_alco.web.repository.LegalPageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LegalPageService {

    private final LegalPageRepository legalPageRepository;

    // ── Public: only published pages ───────────────────────────────────

    public List<LegalPage> getPublishedPages() {
        return legalPageRepository.findByPublishedTrueOrderByType();
    }

    public LegalPage getPublishedById(String id) {
        return legalPageRepository.findByIdAndPublishedTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Página legal no encontrada: " + id));
    }

    // ── Admin: all pages ───────────────────────────────────────────────

    public List<LegalPage> getAllPages() {
        return legalPageRepository.findAllByOrderByType();
    }

    public LegalPage getById(String id) {
        return legalPageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Página legal no encontrada: " + id));
    }

    @Transactional
    public LegalPage update(String id, String title, String content, boolean published) {
        LegalPage page = getById(id);
        page.setTitle(title);
        page.setContent(content);
        page.setPublished(published);
        if (published) {
            page.setPublishedAt(java.time.LocalDateTime.now());
        }
        page.setVersion(page.getVersion() + 1);
        return legalPageRepository.save(page);
    }
}
