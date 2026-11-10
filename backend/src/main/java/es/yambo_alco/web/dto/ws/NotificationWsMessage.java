package es.yambo_alco.web.dto.ws;

import java.time.LocalDateTime;

/**
 * Mensaje empujado en tiempo real al usuario cuando llega un nuevo aviso
 * (issue #124). La campana del panel lo recibe y lo añade a la bandeja sin
 * recargar la página.
 */
public record NotificationWsMessage(
        String id,
        String type,
        String title,
        String body,
        String link,
        LocalDateTime createdAt
) {
}
