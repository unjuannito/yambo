package es.yambo_alco.web.controller.dto.user;

import es.yambo_alco.web.service.StaffUpdate;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Null fields are left untouched; blank fields are cleared. */
@Data
public class UpdateStaffRequestDto {
    @Size(max = 500, message = "Photo must be at most 500 characters")
    private String photo;

    @Size(max = 500, message = "Bio must be at most 500 characters")
    private String bio;

    @Size(max = 100, message = "Fun fact must be at most 100 characters")
    private String funFact;

    @Size(max = 50, message = "Nickname must be at most 50 characters")
    private String nickname;

    private Boolean publicVisible;

    @Size(max = 300, message = "Instagram link must be at most 300 characters")
    @Pattern(regexp = "^$|^https://(www\\.)?instagram\\.com/.+", message = "Instagram link must start with https://www.instagram.com/")
    private String instagramUrl;

    public StaffUpdate toUpdate() {
        return StaffUpdate.builder()
                .photo(photo)
                .bio(bio)
                .funFact(funFact)
                .nickname(nickname)
                .publicVisible(publicVisible)
                .instagramUrl(instagramUrl)
                .build();
    }
}
