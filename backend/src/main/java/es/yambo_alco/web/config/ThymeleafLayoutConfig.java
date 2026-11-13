package es.yambo_alco.web.config;

import nz.net.ultraq.thymeleaf.layoutdialect.LayoutDialect;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Habilita {@code layout:decorate}/{@code layout:fragment} (issue #123): los
 * 15 correos automáticos built-in heredan de {@code emails/layout/base-email}
 * en vez de repetir el mismo {@code th:replace} de cabecera/pie en cada uno.
 * Spring Boot añade automáticamente cualquier bean {@code IDialect} al
 * {@code TemplateEngine} autoconfigurado.
 * <p>
 * Solo afecta al motor principal de la app (plantillas del classpath); el
 * motor aislado de {@link es.yambo_alco.web.service.ThymeleafEmailEngine}
 * para cuerpos escritos por el admin se construye aparte y no incluye este
 * dialecto.
 */
@Configuration
public class ThymeleafLayoutConfig {

    @Bean
    public LayoutDialect layoutDialect() {
        return new LayoutDialect();
    }
}
