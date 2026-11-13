package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.model.EmailTemplate;
import es.yambo_alco.web.repository.EmailTemplateRepository;
import es.yambo_alco.web.util.EditableEmailDocument;
import es.yambo_alco.web.util.EmailTemplateCatalog;
import es.yambo_alco.web.util.EmailTemplateCatalog.TemplateDef;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.HashMap;
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
    private final SettingsService settingsService;
    private final EmailRenderer emailRenderer;
    private final MailService mailService;
    private final TemplateEngine templateEngine;

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
        private Map<String, String> variableOverrides;
        private Map<String, Object> variableDefaults;
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
    public TemplateView saveWithVariables(String key, String subject, String body, String updatedBy,
                                          Map<String, String> variables) {
        if (!EmailTemplateCatalog.isKnown(key)) throw new BadRequestException("Plantilla desconocida: " + key);
        if (variables != null) settingsService.saveEmailVariables(key, variables);
        return save(key, subject, body, updatedBy);
    }

    @Transactional
    public List<TemplateView> resetAll() {
        for (TemplateDef definition : EmailTemplateCatalog.all()) reset(definition.key());
        return listTemplates();
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
        settingsService.saveEmailVariables(key, Map.of());
        return toView(def, null);
    }

    /**
     * Vista previa con los valores de ejemplo del catálogo.
     *
     * @param key  clave de la plantilla
     * @param body cuerpo markdown (con tokens) a previsualizar; nulo → plantilla integrada
     * @return HTML completo del correo de muestra
     */
    public String preview(String key, String body, Map<String, String> variables) {
        TemplateDef def = EmailTemplateCatalog.byKey(key);
        if (def == null) throw new BadRequestException("Plantilla desconocida: " + key);
        return renderPreviewDocument(key, def, body, variables);
    }

    public String preview(String key, String body) {
        TemplateDef def = EmailTemplateCatalog.byKey(key);
        if (def == null) {
            throw new BadRequestException("Plantilla desconocida: " + key);
        }
        return renderPreviewDocument(key, def, body);
    }

    /**
     * Correo de prueba: envía el cuerpo (con tokens resueltos a los valores de
     * ejemplo) a la dirección indicada. Si el admin ha personalizado el asunto,
     * se usa; si no, se envía un asunto de muestra.
     */
    @Transactional(readOnly = true)
    public void sendTest(String key, String subject, String body, String to) {
        sendTest(key, subject, body, to, null);
    }

    @Transactional(readOnly = true)
    public void sendTest(String key, String subject, String body, String to, Map<String, String> variables) {
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
        String html = renderPreviewDocument(key, def, trimmedBody, variables);
        String subjectOut = hasCustomSubject
                ? emailRenderer.renderSubject(key, trimmedSubject, def.sampleVariables())
                : (trimmedBody == null || trimmedBody.isBlank()
                        ? "[Prueba] " + def.displayName()
                        : "[" + def.displayName() + "]");
        mailService.sendRaw(to, subjectOut, html);
        log.info("Test email sent for template [{}] to {}", key, to);
    }

    // ── helpers ───────────────────────────────────────────────────────────

    /**
     * Renderiza el documento completo de vista previa / correo de prueba: mismo
     * {@code emails/layout/base-email} y variables headerColor/headerTitle/
     * headerIcon que usa el envío real (issue #123, Part 2), para que
     * previsualizar una personalización no muestre una cabecera distinta de la
     * que vería el socio.
     */
    private String renderPreviewDocument(String key, TemplateDef def, String body) {
        return renderPreviewDocument(key, def, body, null);
    }

    private String renderPreviewDocument(String key, TemplateDef def, String body, Map<String, String> overrides) {
        Map<String, Object> vars = new HashMap<>(def.sampleVariables());
        vars.putAll(emailRenderer.brandVariables());
        // Draft values replace the saved configuration, so removing an override is previewable.
        vars.putAll(overrides == null ? settingsService.getEmailVariables(key)
                : SettingsService.validateEmailVariables(overrides));

        String content;
        if (body == null || body.isBlank()) {
            content = "<p style=\"padding:8px;\">(plantilla por defecto; escribe el cuerpo "
                    + "para previsualizar la personalización)</p>";
        } else {
            String rendered = emailRenderer.renderBody(key, body, vars);
            content = rendered != null ? rendered
                    : "<p style=\"padding:8px;color:#e74c3c;\">(el HTML no se pudo renderizar; "
                            + "revisa la sintaxis Thymeleaf del cuerpo)</p>";
        }

        if (EditableEmailDocument.ownsLayout(body) && content != null) {
            return EditableEmailDocument.renderedDocument(content);
        }
        Context ctx = new Context();
        vars.forEach(ctx::setVariable);
        ctx.setVariable("contentHtml", content);
        return templateEngine.process("emails/layout/base-email", ctx);
    }

    private EmailTemplate loadOverride(String key) {
        return templateRepository.findByKey(key).orElse(null);
    }

    private TemplateView toView(TemplateDef def, EmailTemplate override) {
        TemplateView view = new TemplateView();
        view.setKey(def.key());
        view.setDisplayName(def.displayName());
        view.setDescription(def.description());
        view.setPrimaryLinkToken(def.primaryLinkToken());
        var tokens = new java.util.ArrayList<Map<String, Object>>();
        def.tokens().forEach(t -> tokens.add(Map.of("token", t.token(), "varName", t.varName(),
                "label", t.label(), "sample", t.sample() == null ? "" : t.sample())));
        var samples = new java.util.LinkedHashMap<String, Object>(def.sampleVariables());
        samples.putAll(emailRenderer.brandVariables());
        Map<String, Object> variableDefaults = new HashMap<>();
        for (String field : List.of("headerTitle", "headerColor", "emailDate")) {
            variableDefaults.put(field, samples.getOrDefault(field, ""));
        }
        view.setVariableDefaults(variableDefaults);
        Map<String, String> variableOverrides = settingsService.getEmailVariables(def.key());
        samples.putAll(variableOverrides);
        view.setVariableOverrides(variableOverrides);
        for (String variable : List.of("emailDate", "headerTitle", "headerColor", "headerIcon", "currentYear", "organizationName", "preferencesUrl")) {
            if (samples.containsKey(variable) && tokens.stream().noneMatch(t -> variable.equals(t.get("varName")))) {
                tokens.add(Map.of("token", variable, "varName", variable, "label", variable, "sample", samples.get(variable)));
            }
        }
        view.setTokens(tokens);
        view.setOverridden((override != null && ((override.getBody() != null && !override.getBody().isBlank())
                || (override.getSubject() != null && !override.getSubject().isBlank())))
                || !view.getVariableOverrides().isEmpty());
        view.setSubject(override != null ? override.getSubject() : null);
        view.setBody(override != null && override.getBody() != null ? override.getBody() : EditableEmailDocument.initialBody(def.key()));
        return view;
    }
}
