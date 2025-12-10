package es.yambo_alco.web.exception;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ErrorResponse {

    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();

    private String type;

    private String message;

    private String path;

    private Integer status;

    private String details;
}
