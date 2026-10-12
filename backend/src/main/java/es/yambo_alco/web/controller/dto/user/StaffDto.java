package es.yambo_alco.web.controller.dto.user;

import es.yambo_alco.web.model.Staff;
import es.yambo_alco.web.model.User;
import lombok.Data;

@Data
public class StaffDto {
    private String photo;
    private String bio;
    private String funFact;
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
            dto.bio = staff.getBio();
            dto.funFact = staff.getFunFact();
            dto.manual = staff.isManual();
        }
        return dto;
    }
}
