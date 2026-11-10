package es.yambo_alco.web.service;

import es.yambo_alco.web.controller.dto.notification.NotificationDto;
import es.yambo_alco.web.dto.ws.NotificationWsMessage;
import es.yambo_alco.web.model.Notification;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Bandeja de avisos en tiempo real (issue #124).
 *
 * Cada aviso se guarda de forma persistente (leído/no leído) y se empuja al
 * instante a todas las pestañas abiertas del socio por el canal WebSocket/STOMP
 * ya montado (prefijo `/user`, reconexión automática en el cliente). El correo
 * electrónico queda como canal aparte y sigue gestionándolo quien hoy lo envía,
 * respetando las preferencias de notificación del socio.
 */
@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static final String QUEUE = "/queue/notifications";

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Crea un aviso para el socio, lo persiste y lo empuja en tiempo real a sus
     * pestañas abiertas. Si el socio no está conectado el aviso queda en la
     * bandeja y se verá al abrir el panel. Nunca lanza: un fallo del push no
     * debe romper la operación de negocio que lo dispara.
     */
    @Transactional
    public void notify(User recipient, String type, String title, String body, String link) {
        if (recipient == null || title == null || title.isBlank()) {
            return;
        }
        Notification saved = notificationRepository.save(Notification.builder()
                .recipient(recipient)
                .type(type)
                .title(title)
                .body(body)
                .link(link)
                .build());

        pushToUser(recipient.getUsername(), saved);
    }

    private void pushToUser(String username, Notification n) {
        if (username == null) {
            return;
        }
        try {
            NotificationWsMessage message = new NotificationWsMessage(
                    n.getId(), n.getType(), n.getTitle(), n.getBody(), n.getLink(), n.getCreatedAt());
            messagingTemplate.convertAndSendToUser(username, QUEUE, message);
        } catch (Exception e) {
            // Sin conexión activa: el aviso ya está persistido, se verá al entrar.
            log.debug("No push notification {} to {}: {}", n.getId(), username, e.getMessage());
        }
    }

    public Page<NotificationDto> listForUser(String userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return notificationRepository
                .findByRecipientId(userId, pageable)
                .map(NotificationDto::from);
    }

    public long countUnread(String userId) {
        return notificationRepository.countByRecipientIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markRead(String userId, String notificationId) {
        Notification n = notificationRepository.findById(notificationId).orElse(null);
        if (n != null && userId.equals(n.getRecipient().getId()) && !n.isRead()) {
            n.markRead(LocalDateTime.now());
            notificationRepository.save(n);
        }
    }

    @Transactional
    public void markAllRead(String userId) {
        List<Notification> unread = notificationRepository
                .findByRecipientId(userId, PageRequest.of(0, 100))
                .getContent().stream()
                .filter(n -> !n.isRead())
                .collect(Collectors.toList());
        if (unread.isEmpty()) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        unread.forEach(n -> n.markRead(now));
        notificationRepository.saveAll(unread);
    }

    @Transactional
    public void deleteAll(String userId) {
        notificationRepository.deleteByRecipientId(userId);
    }
}
