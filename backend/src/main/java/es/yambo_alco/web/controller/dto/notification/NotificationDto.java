package es.yambo_alco.web.controller.dto.notification;

import es.yambo_alco.web.model.Notification;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class NotificationDto {
    private String id;
    private String type;
    private String title;
    private String body;
    private String link;
    private boolean isRead;
    private LocalDateTime readAt;
    private LocalDateTime createdAt;

    public static NotificationDto from(Notification n) {
        NotificationDto dto = new NotificationDto();
        dto.id = n.getId();
        dto.type = n.getType();
        dto.title = n.getTitle();
        dto.body = n.getBody();
        dto.link = n.getLink();
        dto.isRead = n.isRead();
        dto.readAt = n.getReadAt();
        dto.createdAt = n.getCreatedAt();
        return dto;
    }
}
