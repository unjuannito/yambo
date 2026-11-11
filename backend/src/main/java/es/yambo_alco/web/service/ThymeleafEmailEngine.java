package es.yambo_alco.web.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.AsyncTaskExecutor;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;
import org.thymeleaf.templateresolver.StringTemplateResolver;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Motor Thymeleaf para cuerpos de correo escritos por el admin (issue #123,
 * Part 2): permite {@code th:each}/{@code th:if}/{@code ${variable}} en las
 * plantillas y comunicados, no solo {{token}} planos.
 * <p>
 * <b>Aislamiento de seguridad</b> (verificado empíricamente antes de escribir
 * esta clase — ver notas de la review): el {@link SpringTemplateEngine} se
 * construye aquí, desde cero, y <b>nunca</b> se conecta al
 * {@code ApplicationContext} real de la app ni a su resolutor de beans. Sin
 * ese resolutor, {@code ${@algunBean...}} no puede resolver nunca un bean de
 * Spring real. Además, el propio motor de SpringEL de Thymeleaf ya bloquea en
 * este modo {@code T(java.lang.Runtime)}, {@code new java.io.File(...)},
 * {@code new java.net.URL(...)}, {@code getClass().forName(...)} y similares
 * con «Access is forbidden for type …» — no hace falta una lista negra propia.
 * <p>
 * <b>Fragmentos</b>: solo se puede resolver (vía {@code th:replace}/
 * {@code th:insert}) lo que esté bajo {@code emails/fragments/} en el
 * classpath — hoy, el fichero compartido de cabecera/pie/tablas. Es un
 * directorio fijo mantenido por el equipo, no por el admin, así que no hay
 * forma de que un cuerpo guardado cargue ningún otro fichero del servidor.
 * <p>
 * <b>Timeout</b>: el render corre en un executor aparte con un límite de
 * tiempo; si se agota o el motor lanza cualquier excepción, se degrada a un
 * render «plano» (lo decide quien llama, vía {@code null}) en vez de romper
 * el envío del correo.
 */
@Service
public class ThymeleafEmailEngine {

    private static final Logger log = LoggerFactory.getLogger(ThymeleafEmailEngine.class);
    private static final long TIMEOUT_SECONDS = 15;

    private final SpringTemplateEngine engine;
    private final AsyncTaskExecutor templateRenderExecutor;

    public ThymeleafEmailEngine(@Qualifier("templateRenderExecutor") AsyncTaskExecutor templateRenderExecutor) {
        this.templateRenderExecutor = templateRenderExecutor;
        this.engine = buildEngine();
    }

    private static SpringTemplateEngine buildEngine() {
        // Solo resuelve nombres bajo emails/fragments/ (nuestros propios fragmentos
        // de confianza) — cualquier otro th:replace/th:insert no encuentra nada real
        // que cargar (cae en el resolutor de cadena de abajo, que lo trata como texto).
        ClassLoaderTemplateResolver fragmentsResolver = new ClassLoaderTemplateResolver();
        fragmentsResolver.setPrefix("templates/");
        fragmentsResolver.setSuffix(".html");
        fragmentsResolver.setTemplateMode(TemplateMode.HTML);
        fragmentsResolver.setCharacterEncoding("UTF-8");
        fragmentsResolver.setCacheable(true);
        fragmentsResolver.setOrder(1);
        fragmentsResolver.setResolvablePatterns(Set.of("emails/fragments/*"));

        // El cuerpo en sí: se procesa pasando el HTML directamente como "nombre" de
        // plantilla — StringTemplateResolver trata ese literal como el contenido.
        StringTemplateResolver stringResolver = new StringTemplateResolver();
        stringResolver.setTemplateMode(TemplateMode.HTML);
        stringResolver.setOrder(2);

        SpringTemplateEngine engine = new SpringTemplateEngine();
        engine.setTemplateResolvers(Set.of(fragmentsResolver, stringResolver));
        // Sin setTemplateEngineContextFactory ni ApplicationContext: a propósito.
        return engine;
    }

    /** Detección automática de modo (issue #123, Part 2, D3): basta con que aparezca "th:". */
    public static boolean isThymeleafMode(String body) {
        return body != null && body.contains("th:");
    }

    /**
     * Renderiza un cuerpo en modo Thymeleaf con límite de tiempo.
     *
     * @return el HTML procesado, o {@code null} si el render agotó el tiempo o
     *         falló (quien llama decide cómo degradar, normalmente con
     *         {@link es.yambo_alco.web.util.EmailHtmlSanitizer#stripThymeleafAttributes}).
     */
    public String renderOrFallback(String body, Map<String, Object> variables) {
        Context context = new Context();
        if (variables != null) {
            variables.forEach(context::setVariable);
        }
        Future<String> future = templateRenderExecutor.submit(() -> engine.process(body, context));
        try {
            return future.get(TIMEOUT_SECONDS, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            log.warn("Render Thymeleaf del cuerpo del correo agotó el tiempo ({}s); se degrada a plano", TIMEOUT_SECONDS);
            return null;
        } catch (Exception e) {
            log.warn("Render Thymeleaf del cuerpo del correo falló; se degrada a plano: {}", e.getMessage());
            return null;
        }
    }
}
