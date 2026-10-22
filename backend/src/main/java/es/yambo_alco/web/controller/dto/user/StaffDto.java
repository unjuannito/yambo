package es.yambo_alco.web.controller.dto.user;

import es.yambo_alco.web.model.Staff;
import es.yambo_alco.web.model.StaffAvatar;
import es.yambo_alco.web.model.StaffPhotoEdit;
import es.yambo_alco.web.model.User;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class StaffDto {
    private String photo;
    private String photoOriginal;
    private StaffPhotoEdit photoEdit;
    private String bio;
    private String funFact;
    private String nickname;
    private String instagramUrl;
    private StaffAvatar avatar;
    private boolean photoConsent;
    private LocalDateTime photoConsentAt;
    private boolean manual;

    /** Returns null when the user is not currently staff. */
    public static StaffDto from(User user) {
        if (!user.isStaff()) {
            return null;
        }
        StaffDto dto = new StaffDto();
        Staff staff = user.getStaff();
        if (staff != null) {
            dto.photo = staff.getPhoto();
            dto.photoOriginal = staff.getPhotoOriginal();
            dto.photoEdit = staff.getPhotoEdit();
            dto.bio = staff.getBio();
            dto.funFact = staff.getFunFact();
            dto.nickname = staff.getNickname();
            dto.instagramUrl = staff.getInstagramUrl();
            dto.avatar = staff.getAvatar();
            dto.photoConsent = staff.isPhotoConsent();
            dto.photoConsentAt = staff.getPhotoConsentAt();
            dto.manual = staff.isManual();
        }
        return dto;
    }
}
