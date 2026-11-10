package es.yambo_alco.web.util;

import es.yambo_alco.web.service.MailService.OrderProductInfo;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Catálogo de los correos automáticos integrados (issue #123).
 * <p>
 * Un registro por plantilla Thymeleaf de {@code templates/emails/}. Define qué
 * plantillas pueden personalizarse, qué variables {@code {{token}}} expone cada
 * una (con etiqueta amigable y valor de ejemplo para la vista previa / correo de
 * prueba) y qué token contiene el enlace principal que renderiza el botón
 * {@code {{boton}}}.
 * <p>
 * Cada token amigable ({@code nombre}, {@code pedido}, …) se mapea al
 * <em>nombre de variable Thymeleaf</em> que la plantilla integrada usa
 * ({@code userName}, {@code orderId}, …). Así un cuerpo de personalización
 * escrito con {@code {{token}}} se resuelve con los datos reales que el
 * {@code HtmlMailService} ya calcula para enviar el correo original.
 */
public final class EmailTemplateCatalog {

    /**
     * Un token insertable {@code {{token}}} amigable.
     *
     * @param token  nombre del placeholder que escribe el admin (p. ej. {@code nombre})
     * @param varName variable Thymeleaf de la plantilla integrada (p. ej. {@code userName})
     * @param label   etiqueta legible para el chip del editor
     * @param sample  valor de ejemplo para la vista previa / correo de prueba
     */
    public record TokenDef(String token, String varName, String label, Object sample) {
    }

    public record TemplateDef(
            String key,
            String displayName,
            String description,
            List<TokenDef> tokens,
            String primaryLinkToken) {

        /** Mapa varName→valor de ejemplo para renderizar la vista previa. */
        public Map<String, Object> sampleVariables() {
            Map<String, Object> map = new LinkedHashMap<>();
            for (TokenDef t : tokens) {
                map.put(t.varName(), t.sample());
            }
            return map;
        }
    }

    public static final String BOTON_TOKEN = "boton";

    private static final List<OrderProductInfo> SAMPLE_PRODUCTS = List.of(
            new OrderProductInfo("Camiseta Yambo", 2, new BigDecimal("10.00"), "Talla M"),
            new OrderProductInfo("Gorra", 1, new BigDecimal("8.50"), ""));

    private static final LocalDateTime SAMPLE_DATE = LocalDateTime.of(2026, 11, 10, 10, 30);

    private static final TokenDef NOMBRE = new TokenDef("nombre", "userName", "Nombre del socio", "Ana García");
    private static final TokenDef PEDIDO = new TokenDef("pedido", "orderId", "Nº de pedido", "4821");
    private static final TokenDef FECHA = new TokenDef("fecha", "orderDate", "Fecha", SAMPLE_DATE);
    private static final TokenDef PRODUCTOS = new TokenDef("productos", "products", "Tabla de productos", SAMPLE_PRODUCTS);
    private static final TokenDef TOTAL = new TokenDef("total", "totalPrice", "Total del pedido", new BigDecimal("28.50"));
    private static final TokenDef ESTADO = new TokenDef("estado", "statusLabel", "Estado", "PENDIENTE DE PAGO");
    private static final TokenDef IBAN = new TokenDef("iban", "iban", "IBAN", "ES91 2100 0418 4502 0005 1332");
    private static final TokenDef ENLACE_PEDIDO = new TokenDef("enlace", "orderUrl", "Ver pedido",
            "https://yambo.example/mi-espacio/mis-pedidos?orderId=4821");

    private static final TokenDef INCIDENCIA = new TokenDef("incidencia", "issueId", "Nº de incidencia", "109");
    private static final TokenDef TITULO = new TokenDef("titulo", "issueTitle", "Título de la incidencia", "Costura deshecha en el cuello");
    private static final TokenDef PRODUCTO = new TokenDef("producto", "productName", "Producto", "Camiseta Yambo");
    private static final TokenDef ENLACE_INC = new TokenDef("enlace", "issueLink", "Ver incidencia",
            "https://yambo.example/mi-espacio/incidencias/109");

    private static final List<TemplateDef> TEMPLATES = List.of(
            new TemplateDef("invitation", "Invitación a registrarse",
                    "Se envía cuando se invita a una persona a crear su cuenta.",
                    List.of(
                            new TokenDef("enlace", "invitationLink", "Enlace para registrarse",
                                    "https://yambo.example/mi-espacio/registro?token=DEMO123"),
                            new TokenDef("expiraEn", "expirationHours", "Vigencia (horas)", 72L)),
                    "enlace"),

            new TemplateDef("order-pending-payment", "Pedido pendiente de pago",
                    "Se envía al confirmar un pedido a la espera de pago.",
                    orderTokens(),
                    "enlace"),

            new TemplateDef("order-confirmed", "Pago confirmado",
                    "Se envía cuando el pago queda confirmado.",
                    orderTokens(),
                    "enlace"),

            new TemplateDef("order-in-progress", "Pedido en preparación",
                    "Se envía cuando el pedido pasa a preparación.",
                    orderTokens(),
                    "enlace"),

            new TemplateDef("order-delivered", "Pedido completado",
                    "Se envía cuando el pedido se da por completado.",
                    orderTokens(),
                    "enlace"),

            new TemplateDef("order-confirming-payment", "Justificante de pago recibido",
                    "Se envía al recibir el justificante de pago pendiente de validar.",
                    orderTokens(),
                    "enlace"),

            new TemplateDef("order-cancelled", "Pedido cancelado",
                    "Se envía al cancelar un pedido (por el socio o por administración).",
                    List.of(NOMBRE, PEDIDO, FECHA, PRODUCTOS, TOTAL, ESTADO,
                            new TokenDef("canceladoPorAdmin", "canceledByAdmin",
                                    "Cancelado por administración (true/false)", false),
                            ENLACE_PEDIDO),
                    "enlace"),

            new TemplateDef("order-admin-updated", "Pedido actualizado por administración",
                    "Se envía cuando un administrador crea o edita el pedido del socio.",
                    List.of(NOMBRE, PEDIDO, FECHA,
                            new TokenDef("accion", "actionLabel", "Acción realizada", "modificado"),
                            new TokenDef("estado", "statusLabel", "Estado", "PAGO CONFIRMADO"),
                            PRODUCTOS,
                            new TokenDef("totalNuevo", "newTotalText", "Total nuevo", "28,50 €"),
                            new TokenDef("totalAnterior", "oldTotalText", "Total anterior", "20,00 €"),
                            new TokenDef("justificacion", "justification", "Motivo", "Corrección de cantidad"),
                            new TokenDef("incidencia", "issueId", "Nº de incidencia", "109"),
                            new TokenDef("enlaceIncidencia", "issueLink", "Ver incidencia",
                                    "https://yambo.example/mi-espacio/incidencias/109"),
                            ENLACE_PEDIDO),
                    "enlace"),

            new TemplateDef("issue-created", "Nueva incidencia",
                    "Se envía al socio cuando se abre una incidencia sobre su producto.",
                    List.of(NOMBRE, INCIDENCIA, TITULO, PRODUCTO,
                            new TokenDef("pedido", "orderId", "Nº de pedido", "4821"),
                            new TokenDef("reportadoPor", "createdBy", "Reportado por", "Equipo Yambo"),
                            new TokenDef("fecha", "createdAt", "Fecha", SAMPLE_DATE),
                            new TokenDef("descripcion", "descriptionHtml", "Descripción",
                                    "<p>La costura del cuello se ha deshecho.</p>"),
                            ENLACE_INC),
                    "enlace"),

            new TemplateDef("issue-comment-added", "Nuevo comentario en incidencia",
                    "Se envía cuando se añade un comentario a una incidencia.",
                    List.of(NOMBRE, INCIDENCIA, TITULO, PRODUCTO,
                            new TokenDef("autor", "commentAuthor", "Autor del comentario", "Equipo Yambo"),
                            new TokenDef("comentario", "commentHtml", "Comentario (HTML)",
                                    "<p>Te proponemos un cambio.</p>"),
                            new TokenDef("fecha", "commentDate", "Fecha", SAMPLE_DATE),
                            ENLACE_INC),
                    "enlace"),

            new TemplateDef("issue-status-changed", "Incidencia actualizada",
                    "Se envía cuando el estado de una incidencia cambia.",
                    List.of(NOMBRE, INCIDENCIA, TITULO, PRODUCTO,
                            new TokenDef("estadoAnterior", "oldStatusText", "Estado anterior", "ABIERTA"),
                            new TokenDef("estadoNuevo", "newStatusText", "Estado nuevo", "EN TRAMITACIÓN"),
                            new TokenDef("cambiadoPor", "changedBy", "Cambiado por", "Equipo Yambo"),
                            new TokenDef("fecha", "changedAt", "Fecha", SAMPLE_DATE),
                            ENLACE_INC),
                    "enlace"),

            new TemplateDef("issue-watcher-added", "Añadido como seguidor de incidencia",
                    "Se envía a quien se añade como seguidor de una incidencia.",
                    List.of(NOMBRE, INCIDENCIA, TITULO, PRODUCTO,
                            new TokenDef("hilo", "threadHtml", "Último mensaje (HTML)",
                                    "<p>Te proponemos un cambio.</p>"),
                            new TokenDef("fecha", "sentAt", "Fecha", SAMPLE_DATE),
                            ENLACE_INC),
                    "enlace"),

            new TemplateDef("password-reset", "Restablecer contraseña",
                    "Se envía al solicitar el restablecimiento de la contraseña.",
                    List.of(
                            new TokenDef("enlace", "resetLink", "Enlace para restablecer",
                                    "https://yambo.example/restablecer?token=DEMO123"),
                            new TokenDef("expiraEn", "expirationHours", "Vigencia (horas)", 24L)),
                    "enlace"),

            new TemplateDef("account-access", "Acceso a tu cuenta",
                    "Se envía a un miembro de equipo para que cree su contraseña.",
                    List.of(NOMBRE,
                            new TokenDef("enlace", "accessLink", "Enlace para crear la contraseña",
                                    "https://yambo.example/crear-cuenta?token=DEMO123"),
                            new TokenDef("expiraEn", "expirationDays", "Vigencia (días)", 7L)),
                    "enlace"),

            new TemplateDef("activity-open-registration", "Inscripciones abiertas",
                    "Se envía cuando las inscripciones de una actividad se abren.",
                    List.of(
                            new TokenDef("nombreActividad", "activityName", "Nombre de la actividad", "Taller de serigrafía"),
                            new TokenDef("enlace", "activityUrl", "Enlace de inscripción",
                                    "https://yambo.example/actividades/taller-serigrafia")),
                    "enlace")
    );

    private static List<TokenDef> orderTokens() {
        return List.of(NOMBRE, PEDIDO, FECHA, PRODUCTOS, TOTAL, ESTADO, IBAN, ENLACE_PEDIDO);
    }

    private EmailTemplateCatalog() {
    }

    public static List<TemplateDef> all() {
        return TEMPLATES;
    }

    public static TemplateDef byKey(String key) {
        for (TemplateDef def : TEMPLATES) {
            if (def.key().equals(key)) {
                return def;
            }
        }
        return null;
    }

    public static boolean isKnown(String key) {
        return byKey(key) != null;
    }

    public static List<String> allKeys() {
        return TEMPLATES.stream().map(TemplateDef::key).toList();
    }
}
