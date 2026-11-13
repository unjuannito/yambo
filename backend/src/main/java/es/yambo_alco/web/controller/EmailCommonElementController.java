package es.yambo_alco.web.controller;

import es.yambo_alco.web.service.EmailCommonElementService;
import es.yambo_alco.web.service.EmailCommonElementService.CommonElementView;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Elementos comunes de correo (issue #123, Part 2): cabecera/pie de los
 * comunicados ({@code header}/{@code footer}) y componentes adicionales que
 * el admin crea desde la GUI. Los 15 correos automáticos no usan esto.
 */
@RestController
@RequestMapping("/email-common-elements")
@RequiredArgsConstructor
public class EmailCommonElementController {

    private final EmailCommonElementService service;

    @GetMapping
    @PreAuthorize("@permissionCheck.hasPermission('email_common', 'read')")
    public ResponseEntity<List<CommonElementView>> list() {
        return ResponseEntity.ok(service.list());
    }

    @PostMapping
    @PreAuthorize("@permissionCheck.hasPermission('email_common', 'create')")
    public ResponseEntity<CommonElementView> create(@RequestBody CreateRequest request) {
        return ResponseEntity.ok(service.create(request.getName(), request.getHtml(), request.getDescription()));
    }

    @PutMapping("/{key}")
    @PreAuthorize("@permissionCheck.hasPermission('email_common', 'update')")
    public ResponseEntity<CommonElementView> update(@PathVariable String key, @RequestBody UpdateRequest request) {
        return ResponseEntity.ok(service.update(key, request.getHtml()));
    }

    @DeleteMapping("/{key}")
    @PreAuthorize("@permissionCheck.hasPermission('email_common', 'delete')")
    public ResponseEntity<Void> delete(@PathVariable String key) {
        service.delete(key);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{key}/reset")
    @PreAuthorize("@permissionCheck.hasPermission('email_common', 'update')")
    public ResponseEntity<CommonElementView> reset(@PathVariable String key) {
        return ResponseEntity.ok(service.resetToDefault(key));
    }

    @Data
    public static class UpdateRequest {
        private String html;
    }

    @Data
    public static class CreateRequest {
        private String name;
        private String html;
        private String description;
    }
}
