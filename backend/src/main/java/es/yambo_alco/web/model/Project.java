package es.yambo_alco.web.model;

import es.yambo_alco.web.util.CustomId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "project", schema = "public")
public class Project {

    @Id
    @CustomId
    private String id;

    @Column(nullable = false, unique = true)
    private String name;

    /** Public URL fragment, assigned on creation and kept across renames. */
    @Column(length = 120, unique = true)
    private String slug;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = true)
    private String season;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 500)
    private String image;

    @Builder.Default
    @Column(nullable = false)
    private boolean featured = false;

    @Column(name = "signature_color", length = 7)
    private String signatureColor;

    @Column(name = "coordination_email", length = 254)
    private String coordinationEmail;
}