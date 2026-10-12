package es.yambo_alco.web.controller.dto.user;

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
}
