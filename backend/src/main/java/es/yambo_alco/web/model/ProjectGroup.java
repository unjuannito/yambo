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
@Table(name = "project_group", schema = "public")
public class ProjectGroup {

    @Id
    @CustomId
    private String id;

    @Column(nullable = true)
    private String name;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;
}
