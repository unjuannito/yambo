package es.yambo_alco.web.service;

import lombok.Builder;
import lombok.Value;

/** Changes to a staff card. Null fields are left untouched; blank fields are cleared. */
@Value
@Builder
public class StaffUpdate {
    String photo;
    /** The photo as uploaded, when {@link #photo} is a framed version of it. */
    String photoOriginal;
    es.yambo_alco.web.model.StaffPhotoEdit photoEdit;
    String bio;
    String funFact;
    String nickname;
    Boolean photoConsent;
    String instagramUrl;
}
