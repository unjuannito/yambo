package es.yambo_alco.web.model;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * How the original photo is framed to produce the staff photo: where its centre sits, how far
 * it is zoomed in and how much it is rotated. Stored so the framing can be adjusted again.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffPhotoEdit {

    /** Horizontal offset of the photo centre, as a fraction of how far it can move (-1 to 1). */
    @NotNull
    @DecimalMin("-1")
    @DecimalMax("1")
    private Double x;

    /** Vertical offset of the photo centre, as a fraction of how far it can move (-1 to 1). */
    @NotNull
    @DecimalMin("-1")
    @DecimalMax("1")
    private Double y;

    /** 1 = the photo just covers the frame. */
    @NotNull
    @DecimalMin("1")
    @DecimalMax("4")
    private Double zoom;

    /** Degrees, clockwise. */
    @NotNull
    @DecimalMin("-180")
    @DecimalMax("180")
    private Double rotation;
}
