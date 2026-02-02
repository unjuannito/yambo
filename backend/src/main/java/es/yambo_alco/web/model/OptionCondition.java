package es.yambo_alco.web.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OptionCondition {
    private String when;
    private Object is; // Can be String or List<String>
    private String then; // "show", "hide", "enable", "disable"
}