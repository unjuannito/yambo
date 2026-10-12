package es.yambo_alco.web.service;

import lombok.Builder;
import lombok.Value;

/** Changes to a staff card. Null fields are left untouched; blank fields are cleared. */
@Value
@Builder
public class StaffUpdate {
    String photo;
    String bio;
    String funFact;
    String nickname;
    Boolean publicVisible;
    String instagramUrl;
}
