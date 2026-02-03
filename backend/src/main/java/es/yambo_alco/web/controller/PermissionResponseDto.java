package es.yambo_alco.web.controller;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PermissionResponseDto {
    private String id;
    private String resource;
    private String action;
    private boolean hasCondition;
    private String description;
}