package es.yambo_alco.web.controller;

import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.EmailTemplateService;
import es.yambo_alco.web.service.EmailTemplateService.TemplateView;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Administración de los correos automáticos personalizables (issue #123).
 * <p>
 * La asociación puede reescribir cada correo automático (invitación, pedido,
 * incidencias, …) con un editor markdown que admite variables
 * {@code {{token}}}. Estos endpoints sirven el catálogo de plantillas, el
 * estado de la personalización, la vista previa, el correo de prueba y el
 * guardado.
 */
@RestController
@RequestMapping("/email-templates")
@RequiredArgsConstructor
public class EmailTemplateController {

    private final EmailTemplateService templateService;
    private final AuthService authService;

    @GetMapping
    @PreAuthorize("@permissionCheck.hasPermission('email_template', 'read')")
    public ResponseEntity<List<TemplateView>> listTemplates() {
        return ResponseEntity.ok(templateService.listTemplates());
    }

    @GetMapping("/{key}")
    @PreAuthorize("@permissionCheck.hasPermission('email_template', 'read')")
    public ResponseEntity<TemplateView> getTemplate(@PathVariable String key) {
        return ResponseEntity.ok(templateService.getTemplate(key));
    }

    @PostMapping("/{key}")
    @PreAuthorize("@permissionCheck.hasPermission('email_template', 'update')")
    public ResponseEntity<TemplateView> saveTemplate(
            @PathVariable String key, @Valid @RequestBody SaveTemplateRequest request) {
        String updatedBy = authService.getCurrentUser(true).getName();
        return ResponseEntity.ok(templateService.save(key, request.getSubject(), request.getBody(), updatedBy));
    }

    @DeleteMapping("/{key}")
    @PreAuthorize("@permissionCheck.hasPermission('email_template', 'update')")
    public ResponseEntity<TemplateView> resetTemplate(@PathVariable String key) {
        return ResponseEntity.ok(templateService.reset(key));
    }

    /** Vista previa del correo de muestra (body nulo → plantilla por defecto). */
    @PostMapping("/{key}/preview")
    @PreAuthorize("@permissionCheck.hasPermission('email_template', 'read')")
    public ResponseEntity<PreviewResponse> preview(
            @PathVariable String key, @RequestBody(required = false) SaveTemplateRequest request) {
        String body = request == null ? null : request.getBody();
        return ResponseEntity.ok(new PreviewResponse(templateService.preview(key, body)));
    }

    /** Correo de prueba: envía el cuerpo (con tokens a valores de ejemplo) a un email. */
    @PostMapping("/{key}/test")
    @PreAuthorize("@permissionCheck.hasPermission('email_template', 'update')")
    public ResponseEntity<Void> sendTest(
            @PathVariable String key, @Valid @RequestBody SendTestRequest request) {
        templateService.sendTest(key, request.getSubject(), request.getBody(), request.getTo());
        return ResponseEntity.ok().build();
    }

    // ── DTOs ────────────────────────────────────────────────────────────

    @Data
    public static class SaveTemplateRequest {
        private String subject;
        private String body;
    }

    @Data
    public static class SendTestRequest {
        @NotBlank(message = "La dirección es obligatoria")
        private String to;
        private String subject;
        private String body;
    }

    @Data
    @lombok.AllArgsConstructor
    public static class PreviewResponse {
        private String html;
    }
}
