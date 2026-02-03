package es.yambo_alco.web.controller.dto.profile;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.util.List;

import es.yambo_alco.web.controller.PermissionResponseDto;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProfileResponseDto {
    private String id;
    private String name;
    private List<PermissionResponseDto> permissions;
    private boolean isDefault;
}