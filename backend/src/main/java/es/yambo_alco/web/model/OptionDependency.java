package es.yambo_alco.web.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OptionDependency {
    private String dependsOn;
    private List<String> requiredFor;
    private String action; // "disable", "hide"
}