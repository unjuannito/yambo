package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.Notice;
import es.yambo_alco.web.repository.NoticeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Tablón de anuncios (issue #132) + página pública (issue #133).
 */
@Service
@RequiredArgsConstructor
public class NoticeService {

    private final NoticeRepository noticeRepository;
    private final SlugService slugService;

    // ── Admin: all notices ─────────────────────────────────────────────

    public List<Notice> getAll() {
        return noticeRepository.findAllByOrderByPinnedDescPublishedAtDesc();
    }

    public Notice getById(String id) {
        return noticeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Anuncio no encontrado: " + id));
    }

    @Transactional
    public Notice create(String title, String content, boolean pinned, boolean isPublic,
                          LocalDateTime expiresAt, String createdBy) {
        validate(title, content);

        Notice notice = Notice.builder()
                .title(title.trim())
                .content(content)
                .slug(slugService.forNotice(title))
                .pinned(pinned)
                .isPublic(isPublic)
                .publishedAt(LocalDateTime.now())
                .expiresAt(expiresAt)
                .createdBy(createdBy)
                .build();
        return noticeRepository.save(notice);
    }

    @Transactional
    public Notice update(String id, String title, String content, boolean pinned, boolean isPublic,
                          LocalDateTime expiresAt) {
        validate(title, content);

        Notice notice = getById(id);
        notice.setTitle(title.trim());
        notice.setContent(content);
        notice.setPinned(pinned);
        notice.setPublic(isPublic);
        notice.setExpiresAt(expiresAt);
        return noticeRepository.save(notice);
    }

    @Transactional
    public void delete(String id) {
        if (!noticeRepository.existsById(id)) {
            throw new ResourceNotFoundException("Anuncio no encontrado: " + id);
        }
        noticeRepository.deleteById(id);
    }

    private void validate(String title, String content) {
        if (title == null || title.trim().isBlank()) {
            throw new BadRequestException("El título es obligatorio");
        }
        if (content == null || content.trim().isBlank()) {
            throw new BadRequestException("El contenido es obligatorio");
        }
    }

    // ── Any logged-in member: active (not expired) notices ──────────────

    public List<Notice> getActive() {
        return noticeRepository.findActive(LocalDateTime.now());
    }

    // ── Public (no login): active + public notices ──────────────────────

    public List<Notice> getActivePublic() {
        return noticeRepository.findActivePublic(LocalDateTime.now());
    }

    public Notice getActivePublicByIdOrSlug(String idOrSlug) {
        return noticeRepository.findBySlugAndIsPublicTrue(idOrSlug)
                .or(() -> noticeRepository.findByIdAndIsPublicTrue(idOrSlug))
                .filter(n -> !n.isExpired())
                .orElseThrow(() -> new ResourceNotFoundException("Anuncio no encontrado: " + idOrSlug));
    }
}
