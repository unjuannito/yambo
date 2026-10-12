package es.yambo_alco.web.model;

import java.util.List;

public record UserFilter(
    String query,
    String id,
    String name,
    String email,
    Boolean enabled,
    List<String> permissions,
    List<String> profiles,
    String role,
    Boolean staff
) {}
