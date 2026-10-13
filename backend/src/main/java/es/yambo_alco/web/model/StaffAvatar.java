package es.yambo_alco.web.model;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * The elephant shown instead of the photo, as customised by the staff member.
 * The options mirror the ones the frontend knows how to draw (ElephantAvatar).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffAvatar {

    /** Index of the pastel background. */
    @NotNull
    @Min(0)
    @Max(11)
    private Integer background;

    @NotNull
    @Pattern(regexp = "tee-star|jacket|dots|tee-swirl|stripes|hoodie|tee-heart|overalls|scarf|tee-y")
    private String clothes;

    @NotNull
    @Pattern(regexp = "dots|sleepy|glasses|happy|wink|sunglasses|lashes|stars")
    private String eyes;

    @NotNull
    @Pattern(regexp = "none|tuft|beanie|flower|curls|cap|crown|bow|party|headphones|mohawk")
    private String top;

    @NotNull
    @Pattern(regexp = "none|blush|freckles|earring")
    private String extra;

    private boolean trunkUp;

    private boolean flip;
}
