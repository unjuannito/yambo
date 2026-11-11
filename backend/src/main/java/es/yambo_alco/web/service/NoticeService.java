package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.NotificationPreferences;
import es.yambo_alco.web.model.Notice;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.NoticeRepository;
import es.yambo_alco.web.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(NoticeService.class);

    private final NoticeRepository noticeRepository;
    private final SlugService slugService;
    private final UserRepository userRepository;
    private final UserService userService;
    private final MailService mailService;
    private final SettingsService settingsService;

    // ── Admin: all notices ─────────────────────────────────────────────

    public List<Notice> getAll() {
        return noticeRepository.findAllByOrderByPinnedDescPublishedAtDesc();
    }

    public Notice getById(String id) {
        return noticeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Anuncio no encontrado: " + id));
    }

    @Transactional
    public Notice create(String title, String content, String image, boolean pinned, boolean isPublic,
                          LocalDateTime expiresAt, String createdBy) {
        validate(title, content);

        Notice notice = Notice.builder()
                .title(title.trim())
                .content(content)
                .image(image)
                .slug(slugService.forNotice(title))
                .pinned(pinned)
                .isPublic(isPublic)
                .publishedAt(LocalDateTime.now())
                .expiresAt(expiresAt)
                .createdBy(createdBy)
                .build();
        Notice saved = noticeRepository.save(notice);
        notifyMembers(saved);
        return saved;
    }

    @Transactional
    public Notice update(String id, String title, String content, String image, boolean pinned, boolean isPublic,
                          LocalDateTime expiresAt) {
        validate(title, content);

        Notice notice = getById(id);
        notice.setTitle(title.trim());
        notice.setContent(content);
        notice.setImage(image);
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

    // ── Email al publicar (issue #132, v2) ───────────────────────────────

    /**
     * Avisa a los socios con cuenta activa que respetan esta preferencia.
     * No debe romper la creación del anuncio si algo falla aquí: el envío en
     * sí es asíncrono ({@code @Async}), esto solo arma la lista de destinatarios.
     */
    private void notifyMembers(Notice notice) {
        try {
            String noticeImageUrl = resolveAbsoluteUrl(notice.getImage());
            String noticeLink = notice.isPublic()
                    ? settingsService.getDomain() + "/anuncios/" + (notice.getSlug() != null ? notice.getSlug() : notice.getId())
                    : settingsService.getDomain() + "/mi-espacio";

            List<User> members = userRepository.findByEnabledTrueAndHasAccountTrueAndSystemFalse();
            for (User member : members) {
                if (member.getEmail() == null || member.getEmail().isBlank()) {
                    continue;
                }
                NotificationPreferences prefs = userService.getNotificationPreferences(member.getId());
                if (!prefs.isNoticePublished()) {
                    continue;
                }
                mailService.sendNoticePublished(
                        member.getEmail(), member.getName(), notice.getTitle(), notice.getContent(),
                        noticeImageUrl, noticeLink);
            }
        } catch (Exception e) {
            log.error("Failed to dispatch notice-published emails for notice {}", notice.getId(), e);
        }
    }

    private String resolveAbsoluteUrl(String image) {
        if (image == null || image.isBlank()) {
            return null;
        }
        return image.startsWith("/") ? settingsService.getDomain() + image : image;
    }
}
