package es.yambo_alco.web.model;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import es.yambo_alco.web.util.CustomId;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "product", schema = "public")
public class Product {

    @Id
    @CustomId
    private String id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(name = "project_id")
    private String projectId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", insertable = false, updatable = false)
    private Project project;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    @Builder.Default
    @Column(name = "base_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal basePrice = BigDecimal.ZERO;

    @Builder.Default
    @Column(nullable = false, columnDefinition = "jsonb", name = "options")
    @JdbcTypeCode(SqlTypes.JSON)
    private String optionsJson = "[]";

    @Builder.Default
    @Column(nullable = false, columnDefinition = "jsonb", name = "images")
    @JdbcTypeCode(SqlTypes.JSON)
    private String imagesJson = "[]";

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "short_description", columnDefinition = "TEXT")
    private String shortDescription;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_product_id")
    private FamilyProduct familyProduct;

    @Transient
    private List<ProductOption> options;

    @Transient
    private List<String> images;

    private static final ObjectMapper objectMapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    private static List<ProductOption> sanitizeOptions(List<ProductOption> rawOptions) {
        if (rawOptions == null) {
            return new ArrayList<>();
        }

        return rawOptions.stream()
                .filter(o -> o != null && ProductOption.isSupportedType(o.getType()))
                .map(o -> {
                    if (!"select".equals(o.getType())) {
                        o.setValues(null);
                    } else if (o.getValues() == null) {
                        o.setValues(new ArrayList<>());
                    }
                    return o;
                })
                .collect(Collectors.toList());
    }

    public List<ProductOption> getOptions() {
        if (options == null && optionsJson != null) {
            try {
                options = sanitizeOptions(objectMapper.readValue(optionsJson, new TypeReference<List<ProductOption>>() {}));
            } catch (Exception e) {
                options = new ArrayList<>();
            }
        }
        return options;
    }

    public void setOptions(List<ProductOption> options) {
        this.options = sanitizeOptions(options);
        try {
            this.optionsJson = objectMapper.writeValueAsString(this.options);
        } catch (Exception e) {
            this.optionsJson = "[]";
        }
    }

    public List<String> getImages() {
        if (images == null && imagesJson != null) {
            try {
                images = objectMapper.readValue(imagesJson, new TypeReference<List<String>>() {});
            } catch (Exception e) {
                images = new ArrayList<>();
            }
        }
        return images;
    }

    public void setImages(List<String> images) {
        this.images = images;
        try {
            this.imagesJson = objectMapper.writeValueAsString(images != null ? images : new ArrayList<>());
        } catch (Exception e) {
            this.imagesJson = "[]";
        }
    }

    @PrePersist
    @PreUpdate
    private void updateJsonFields() {
        if (options != null) {
            try {
                this.optionsJson = objectMapper.writeValueAsString(options);
            } catch (Exception e) {
                this.optionsJson = "[]";
            }
        }
        if (images != null) {
            try {
                this.imagesJson = objectMapper.writeValueAsString(images);
            } catch (Exception e) {
                this.imagesJson = "[]";
            }
        }
    }
}