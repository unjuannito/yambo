package es.yambo_alco.web.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OptionValue {
    private String id;
    private String label;
    private BigDecimal price;
    private String photo;
    private Map<String, Object> meta;
}