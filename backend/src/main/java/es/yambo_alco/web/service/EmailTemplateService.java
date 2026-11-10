package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.model.EmailTemplate;
import es.yambo_alco.web.repository.EmailTemplateRepository;
import es.yambo_alco.web.util.EmailTemplateCatalog;
import es.yambo_alco.web.util.EmailTemplateCatalog.TemplateDef;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * Gestión de los correos automáticos personalizables (issue #123).
 * <p>
 * Cada correo automático de la app (invitación, pedido, incidencias, …) puede
 * reescribirse por la asociación. Una fila en {@code email_template} con
 * {@code body} no nulo sustituye a la plantilla Thymeleaf integrada; si no hay
 * fila (o {@code body} es nulo) se usa la plantilla por defecto.
 * <p>
 * El cuerpo se guarda como <b>markdown</b> con placeholders {@code {{token}}};
 * al enviar se sanea, se resuelven los tokens y se envuelven en el layout de
 * marca. La misma vista previa / correo de prueba usa valores de ejemplo del
 * {@link EmailTemplateCatalog}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailTemplateService {

    private final EmailTemplateRepository templateRepository;
    private final EmailRenderer emailRenderer;
    private final MailService mailService;

    /** Vista de una plantilla para el admin: metadatos del catálogo + estado del override. */
    @Data
    public static class TemplateView {
        private String key;
        private String displayName;
        private String description;
        private List<Map<String, Object>> tokens;
        private String primaryLinkToken;
        private boolean overridden;
        private String subject;
        private String body;
    }

    @Transactional(readOnly = true)
    public List<TemplateView> listTemplates() {
        return EmailTemplateCatalog.all().stream().map(def -> toView(def, loadOverride(def.key()))).toList();
    }

    @Transactional(readOnly = true)
    public TemplateView getTemplate(String key) {
        if (!EmailTemplateCatalog.isKnown(key)) {
            throw new BadRequestException("Plantilla desconocida: " + key);
        }
        return toView(EmailTemplateCatalog.byKey(key), loadOverride(key));
    }

    /**
     * Guarda (o reemplaza) la personalización de una plantilla.
     *
     * @param subject asunto personalizado (markdown, con tokens) o nulo para el por defecto
     * @param body    cuerpo markdown (con tokens); vacío/nulo → volver a la plantilla por defecto
     */
    @Transactional
    public TemplateView save(String key, String subject, String body, String updatedBy) {
        TemplateDef def = EmailTemplateCatalog.byKey(key);
        if (def == null) {
            throw new BadRequestException("Plantilla desconocida: " + key);
        }
        String trimmedBody = body == null ? null : body.trim();
        String trimmedSubject = subject == null ? null : subject.trim();

        EmailTemplate row = loadOverride(key);
        boolean hasContent = (trimmedBody != null && !trimmedBody.isBlank())
                || (trimmedSubject != null && !trimmedSubject.isBlank());

        if (!hasContent) {
            // Sin personalización → quitar la fila (usa la plantilla integrada).
            if (row != null) {
                templateRepository.delete(row);
            }
            return toView(def, null);
        }

        EmailTemplate toSave = row != null ? row : new EmailTemplate();
        toSave.setKey(key);
        toSave.setSubject(trimmedSubject);
        toSave.setBody(trimmedBody);
        toSave.setUpdatedBy(updatedBy);
        templateRepository.save(toSave);

        return toView(def, toSave);
    }

    @Transactional
    public TemplateView reset(String key) {
        TemplateDef def = EmailTemplateCatalog.byKey(key);
        if (def == null) {
            throw new BadRequestException("Plantilla desconocida: " + key);
        }
        EmailTemplate row = loadOverride(key);
        if (row != null) {
            templateRepository.delete(row);
        }
        return toView(def, null);
    }

    /**
     * Vista previa con los valores de ejemplo del catálogo.
     *
     * @param key  clave de la plantilla
     * @param body cuerpo markdown (con tokens) a previsualizar; nulo → plantilla integrada
     * @return HTML completo del correo de muestra
     */
    public String preview(String key, String body) {
        TemplateDef def = EmailTemplateCatalog.byKey(key);
        if (def == null) {
            throw new BadRequestException("Plantilla desconocida: " + key);
        }
        if (body == null || body.isBlank()) {
            // Sin personalización: la vista previa mostraría la plantilla integrada,
            // que renderiza Thymeleaf (fuera del render de tokens); se informa al admin.
            return emailRenderer.envelope("<p style=\"padding:8px;\">(plantilla por defecto; "
                    + "escribe el cuerpo para previsualizar la personalización)</p>");
        }
        String rendered = emailRenderer.renderBody(key, body, def.sampleVariables());
        return emailRenderer.envelope(rendered);
    }

    /**
     * Correo de prueba: envía el cuerpo (con tokens resueltos a los valores de
     * ejemplo) a la dirección indicada. Si el admin ha personalizado el asunto,
     * se usa; si no, se envía un asunto de muestra.
     */
    @Transactional(readOnly = true)
    public void sendTest(String key, String subject, String body, String to) {
        TemplateDef def = EmailTemplateCatalog.byKey(key);
        if (def == null) {
            throw new BadRequestException("Plantilla desconocida: " + key);
        }
        if (to == null || !to.contains("@")) {
            throw new BadRequestException("Dirección de correo no válida");
        }
        String trimmedSubject = subject == null ? null : subject.trim();
        boolean hasCustomSubject = trimmedSubject != null && !trimmedSubject.isBlank();
        String trimmedBody = body == null ? null : body.trim();
        String html;
        String subjectOut;
        if (trimmedBody == null || trimmedBody.isBlank()) {
            // Envía la plantilla integrada tal cual (Thymeleaf) con los valores de ejemplo.
            html = emailRenderer.envelope("<p>(vista previa de la plantilla por defecto)</p>");
            subjectOut = hasCustomSubject
                    ? emailRenderer.renderSubject(key, trimmedSubject, def.sampleVariables())
                    : "[Prueba] " + def.displayName();
        } else {
            html = emailRenderer.envelope(emailRenderer.renderBody(key, trimmedBody, def.sampleVariables()));
            subjectOut = hasCustomSubject
                    ? emailRenderer.renderSubject(key, trimmedSubject, def.sampleVariables())
                    : "[" + def.displayName() + "]";
        }
        mailService.sendRaw(to, subjectOut, html);
        log.info("Test email sent for template [{}] to {}", key, to);
    }

    // ── helpers ───────────────────────────────────────────────────────────

    private EmailTemplate loadOverride(String key) {
        return templateRepository.findByKey(key).orElse(null);
    }

    private TemplateView toView(TemplateDef def, EmailTemplate override) {
        TemplateView view = new TemplateView();
        view.setKey(def.key());
        view.setDisplayName(def.displayName());
        view.setDescription(def.description());
        view.setPrimaryLinkToken(def.primaryLinkToken());
        view.setTokens(def.tokens().stream()
                .map(t -> Map.<String, Object>of(
                        "token", t.token(),
                        "label", t.label(),
                        "sample", t.sample() == null ? "" : t.sample()))
                .toList());
        view.setOverridden(override != null && override.getBody() != null && !override.getBody().isBlank());
        view.setSubject(override != null ? override.getSubject() : null);
        view.setBody(override != null ? override.getBody() : null);
        return view;
    }
}
