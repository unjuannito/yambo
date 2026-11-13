package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.enums.CampaignAudience;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.CampaignService;
import es.yambo_alco.web.service.CampaignService.CampaignView;
import es.yambo_alco.web.service.CampaignService.RecipientSummary;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Comunicados / broadcast (issue #123).
 * <p>
 * La asociación redacta un correo (asunto + cuerpo markdown) y lo envía de una
 * vez a una audiencia (todos, un perfil, un proyecto, un grupo o una lista de
 * socios). Antes de enviar se muestra un resumen de destinatarios (con el
 * opt-out aplicado) y el envío se hace de forma asíncrona.
 */
@RestController
@RequestMapping("/campaigns")
@RequiredArgsConstructor
public class CampaignController {

    private final CampaignService campaignService;
    private final AuthService authService;

    @GetMapping
    @PreAuthorize("@permissionCheck.hasPermission('campaign', 'read')")
    public ResponseEntity<List<CampaignView>> listCampaigns() {
        return ResponseEntity.ok(campaignService.list());
    }

    @GetMapping("/variables")
    @PreAuthorize("@permissionCheck.hasPermission('campaign', 'read')")
    public ResponseEntity<java.util.List<es.yambo_alco.web.util.CampaignVariables.Variable>> variables() {
        return ResponseEntity.ok(campaignService.variables());
    }

    @GetMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('campaign', 'read')")
    public ResponseEntity<CampaignView> getCampaign(@PathVariable String id) {
        return ResponseEntity.ok(campaignService.get(id));
    }

    @PostMapping
    @PreAuthorize("@permissionCheck.hasPermission('campaign', 'create')")
    public ResponseEntity<CampaignView> createCampaign(@RequestBody CreateCampaignRequest request) {
        String sentBy = authService.getCurrentUser(true).getName();
        return ResponseEntity.status(201).body(campaignService.create(
                request.getSubject(), request.getBody(), request.getAudienceType(),
                request.getAudienceRef(), request.getAudienceUsers(), sentBy));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('campaign', 'update')")
    public ResponseEntity<CampaignView> updateCampaign(
            @PathVariable String id, @RequestBody UpdateCampaignRequest request) {
        String sentBy = authService.getCurrentUser(true).getName();
        return ResponseEntity.ok(campaignService.update(
                id, request.getSubject(), request.getBody(), request.getAudienceType(),
                request.getAudienceRef(), request.getAudienceUsers(), sentBy));
    }

    /** Resumen de destinatarios (para el diálogo de confirmación antes de enviar). */
    @GetMapping("/{id}/recipients")
    @PreAuthorize("@permissionCheck.hasPermission('campaign', 'read')")
    public ResponseEntity<RecipientSummary> previewRecipients(@PathVariable String id) {
        return ResponseEntity.ok(campaignService.previewRecipients(id));
    }

    /** Vista previa del cuerpo renderizado (para el iframe del editor). */
    @GetMapping("/{id}/preview")
    @PreAuthorize("@permissionCheck.hasPermission('campaign', 'read')")
    public ResponseEntity<CampaignService.CampaignPreviewResponse> previewHtml(@PathVariable String id) {
        return ResponseEntity.ok(new CampaignService.CampaignPreviewResponse(
                campaignService.previewHtml(id)));
    }

    /** Envía el comunicado (asíncrono). Devuelve el resumen de destinatarios. */
    @PostMapping("/{id}/send")
    @PreAuthorize("@permissionCheck.hasPermission('campaign', 'send')")
    public ResponseEntity<RecipientSummary> sendCampaign(@PathVariable String id) {
        String sentBy = authService.getCurrentUser(true).getName();
        return ResponseEntity.ok(campaignService.send(id, sentBy));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('campaign', 'delete')")
    public ResponseEntity<Void> deleteCampaign(@PathVariable String id) {
        campaignService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── DTOs ────────────────────────────────────────────────────────────

    @Data
    public static class CreateCampaignRequest {
        @NotBlank(message = "El asunto es obligatorio")
        private String subject;
        private String body;
        private CampaignAudience audienceType;
        private String audienceRef;
        private List<String> audienceUsers;
    }

    @Data
    public static class UpdateCampaignRequest {
        private String subject;
        private String body;
        private CampaignAudience audienceType;
        private String audienceRef;
        private List<String> audienceUsers;
    }
}
