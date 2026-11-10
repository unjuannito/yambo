package es.yambo_alco.web.controller;

import es.yambo_alco.web.controller.dto.notification.NotificationDto;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Endpoints de la bandeja de avisos (issue #124). Todos actúan sobre el socio
 * autenticado: listan, marcan como leído y limpan sus propios avisos. El push en
 * tiempo real llega por el canal WebSocket; estos endpoints son la consulta
 * inicial y las acciones.
 */
@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final AuthService authService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<NotificationDto>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        User user = authService.getCurrentUser(true);
        int cappedSize = Math.max(1, Math.min(size, 100));
        return ResponseEntity.ok(notificationService.listForUser(user.getId(), page, cappedSize));
    }

    @GetMapping("/unread-count")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Long> unreadCount() {
        User user = authService.getCurrentUser(true);
        return ResponseEntity.ok(notificationService.countUnread(user.getId()));
    }

    @PostMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> markRead(@PathVariable String id) {
        User user = authService.getCurrentUser(true);
        notificationService.markRead(user.getId(), id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/read-all")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> markAllRead() {
        User user = authService.getCurrentUser(true);
        notificationService.markAllRead(user.getId());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> clearAll() {
        User user = authService.getCurrentUser(true);
        notificationService.deleteAll(user.getId());
        return ResponseEntity.ok().build();
    }
}
