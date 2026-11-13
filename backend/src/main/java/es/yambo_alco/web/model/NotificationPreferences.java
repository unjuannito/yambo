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

    /**
     * Whether this member receives broadcast campaigns. Defaults to true
     * (opt-in) so members who have opted out are the only ones filtered out.
     * Initialised on the field (not only via {@code @Builder.Default}) so that
     * deserialising a stored preferences JSON that predates this field leaves
     * the member opted in.
     */
    @Builder.Default
    private boolean receiveCampaigns = true;

    public static NotificationPreferences defaults() {
        return NotificationPreferences.builder().build();
    }
}
