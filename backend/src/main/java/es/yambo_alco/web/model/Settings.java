package es.yambo_alco.web.model;

import es.yambo_alco.web.util.CustomId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Settings {

    @Id
    @CustomId
    @Column(name = "id", nullable = false, length = 8)
    private String id;

    @Column(name = "key", nullable = false, unique = true)
    private String key;

    @Column(name = "value", columnDefinition = "TEXT")
    private String value;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "category")
    private String category;
}
