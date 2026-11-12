package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.model.EmailCommonElement;
import es.yambo_alco.web.repository.EmailCommonElementRepository;
import es.yambo_alco.web.util.EmailHtmlSanitizer;
import es.yambo_alco.web.util.Slugs;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

/**
 * Gestión de los elementos comunes de correo (issue #123, Part 2): la
 * cabecera/pie de los comunicados ({@code header}/{@code footer}, usados por
 * {@link EmailRenderer#envelope}) más cualquier componente adicional que el
 * admin cree desde la GUI (firma, bloque de redes sociales, …) para
 * copiar/pegar dentro del cuerpo de una plantilla o comunicado.
 */
@Service
@RequiredArgsConstructor
public class EmailCommonElementService {

    /** Claves de los dos elementos sembrados (109-03): no se pueden borrar ni renombrar. */
    private static final Set<String> BUILT_IN_KEYS = Set.of("header", "footer");

    private final EmailCommonElementRepository repository;

    @Data
    public static class CommonElementView {
        private String key;
        private String name;
        private String description;
        private String html;
        private boolean builtIn;
    }

    @Transactional(readOnly = true)
    public List<CommonElementView> list() {
        return repository.findAllByOrderByKeyAsc().stream().map(this::toView).toList();
    }

    @Transactional
    public CommonElementView create(String name, String html, String description) {
        if (name == null || name.isBlank()) {
            throw new BadRequestException("El nombre es obligatorio");
        }
        if (html == null || html.isBlank()) {
            throw new BadRequestException("El contenido no puede quedar vacío");
        }
        String key = uniqueKey(Slugs.slugify(name, "componente"));
        EmailCommonElement element = EmailCommonElement.builder()
                .key(key)
                .name(name.trim())
                .html(EmailHtmlSanitizer.sanitize(html.trim()))
                .description(description == null ? null : description.trim())
                .build();
        return toView(repository.save(element));
    }

    @Transactional
    public CommonElementView update(String key, String html) {
        EmailCommonElement element = getOrThrow(key);
        if (html == null || html.isBlank()) {
            throw new BadRequestException("El contenido no puede quedar vacío");
        }
        element.setHtml(EmailHtmlSanitizer.sanitize(html.trim()));
        return toView(repository.save(element));
    }

    @Transactional
    public void delete(String key) {
        if (BUILT_IN_KEYS.contains(key)) {
            throw new BadRequestException("La cabecera y el pie no se pueden eliminar");
        }
        repository.delete(getOrThrow(key));
    }

    @Transactional
    public CommonElementView resetToDefault(String key) {
        EmailCommonElement element = getOrThrow(key);
        String defaultHtml = "header".equals(key) ? EmailRenderer.DEFAULT_HEADER_HTML
                : "footer".equals(key) ? EmailRenderer.DEFAULT_FOOTER_HTML
                : null;
        if (defaultHtml == null) {
            throw new BadRequestException("Solo la cabecera y el pie tienen un valor por defecto");
        }
        element.setHtml(defaultHtml);
        return toView(repository.save(element));
    }

    private String uniqueKey(String base) {
        String key = base;
        int suffix = 2;
        while (repository.findByKey(key).isPresent()) {
            key = base + "-" + suffix++;
        }
        return key;
    }

    private EmailCommonElement getOrThrow(String key) {
        return repository.findByKey(key)
                .orElseThrow(() -> new BadRequestException("Elemento común desconocido: " + key));
    }

    private CommonElementView toView(EmailCommonElement element) {
        CommonElementView view = new CommonElementView();
        view.setKey(element.getKey());
        view.setName(element.getName());
        view.setDescription(element.getDescription());
        view.setHtml(element.getHtml());
        view.setBuiltIn(BUILT_IN_KEYS.contains(element.getKey()));
        return view;
    }
}
