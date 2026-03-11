package es.yambo_alco.web.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationPreferences {

    @Builder.Default
    private boolean orderStatus = true;

    @Builder.Default
    private boolean orderCancelled = true;

    @Builder.Default
    private boolean issueCreated = true;

    @Builder.Default
    private boolean issueComments = true;

    @Builder.Default
    private boolean issueStatus = true;

    public static NotificationPreferences defaults() {
        return NotificationPreferences.builder().build();
    }
}
