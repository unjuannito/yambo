package es.yambo_alco.web.migration;

import liquibase.change.custom.CustomTaskChange;
import liquibase.database.Database;
import liquibase.database.jvm.JdbcConnection;
import liquibase.exception.CustomChangeException;
import liquibase.exception.SetupException;
import liquibase.exception.ValidationErrors;
import liquibase.resource.ResourceAccessor;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Importa los 15 correos automáticos built-in como filas de {@code email_template}
 * (109-04, issue #123, Part 2).
 * <p>
 * Un {@code CustomTaskChange} en vez de {@code <sqlFile>}: el cuerpo de cada
 * correo contiene {@code ${variable}} (sintaxis Thymeleaf) y Liquibase sustituye
 * {@code ${...}} como propiedad del changelog en CUALQUIER texto que procese —
 * incluido el contenido de {@code <sqlFile>}/{@code <sql>}, sin forma de
 * desactivarlo por tag en esta versión — cayendo a variables de entorno del
 * sistema cuando no hay una propiedad del changelog con ese nombre (comprobado
 * empíricamente: {@code ${userName}} se sustituía por la variable de entorno
 * de Windows {@code USERNAME}). Leer el fichero por Java y pasarlo como
 * parámetro ligado de JDBC evita ese pipeline de sustitución por completo: el
 * contenido nunca es "texto del changelog" en ningún momento.
 */
public class ImportBuiltinEmailTemplatesChange implements CustomTaskChange {

    private record TemplateMeta(String name, String description) {
    }

    private static final Map<String, TemplateMeta> TEMPLATES = new LinkedHashMap<>();

    static {
        TEMPLATES.put("invitation", new TemplateMeta("Invitación a registrarse",
                "Se envía cuando se invita a una persona a crear su cuenta."));
        TEMPLATES.put("order-pending-payment", new TemplateMeta("Pedido pendiente de pago",
                "Se envía al confirmar un pedido a la espera de pago."));
        TEMPLATES.put("order-confirmed", new TemplateMeta("Pago confirmado",
                "Se envía cuando el pago queda confirmado."));
        TEMPLATES.put("order-in-progress", new TemplateMeta("Pedido en preparación",
                "Se envía cuando el pedido pasa a preparación."));
        TEMPLATES.put("order-delivered", new TemplateMeta("Pedido completado",
                "Se envía cuando el pedido se da por completado."));
        TEMPLATES.put("order-confirming-payment", new TemplateMeta("Justificante de pago recibido",
                "Se envía al recibir el justificante de pago pendiente de validar."));
        TEMPLATES.put("order-cancelled", new TemplateMeta("Pedido cancelado",
                "Se envía al cancelar un pedido (por el socio o por administración)."));
        TEMPLATES.put("order-admin-updated", new TemplateMeta("Pedido actualizado por administración",
                "Se envía cuando un administrador crea o edita el pedido del socio."));
        TEMPLATES.put("issue-created", new TemplateMeta("Nueva incidencia",
                "Se envía al socio cuando se abre una incidencia sobre su producto."));
        TEMPLATES.put("issue-comment-added", new TemplateMeta("Nuevo comentario en incidencia",
                "Se envía cuando se añade un comentario a una incidencia."));
        TEMPLATES.put("issue-status-changed", new TemplateMeta("Incidencia actualizada",
                "Se envía cuando el estado de una incidencia cambia."));
        TEMPLATES.put("issue-watcher-added", new TemplateMeta("Añadido como seguidor de incidencia",
                "Se envía a quien se añade como seguidor de una incidencia."));
        TEMPLATES.put("password-reset", new TemplateMeta("Restablecer contraseña",
                "Se envía al solicitar el restablecimiento de la contraseña."));
        TEMPLATES.put("account-access", new TemplateMeta("Acceso a tu cuenta",
                "Se envía a un miembro de equipo para que cree su contraseña."));
        TEMPLATES.put("activity-open-registration", new TemplateMeta("Inscripciones abiertas",
                "Se envía cuando las inscripciones de una actividad se abren."));
    }

    private ResourceAccessor resourceAccessor;

    @Override
    public void setFileOpener(ResourceAccessor resourceAccessor) {
        this.resourceAccessor = resourceAccessor;
    }

    @Override
    public void setUp() throws SetupException {
        // nada que preparar
    }

    @Override
    public ValidationErrors validate(Database database) {
        return new ValidationErrors();
    }

    @Override
    public String getConfirmationMessage() {
        return "Importadas " + TEMPLATES.size() + " plantillas built-in a email_template";
    }

    @Override
    public void execute(Database database) throws CustomChangeException {
        Connection connection = ((JdbcConnection) database.getConnection()).getUnderlyingConnection();
        try {
            for (Map.Entry<String, TemplateMeta> entry : TEMPLATES.entrySet()) {
                String key = entry.getKey();
                if (alreadyImported(connection, key)) {
                    continue;
                }
                String body = readContent(key);
                TemplateMeta meta = entry.getValue();
                try (PreparedStatement insert = connection.prepareStatement(
                        "INSERT INTO email_template (\"key\", subject, body, name, description, created_at, updated_at) "
                                + "VALUES (?, NULL, ?, ?, ?, now(), now())")) {
                    insert.setString(1, key);
                    insert.setString(2, body);
                    insert.setString(3, meta.name());
                    insert.setString(4, meta.description());
                    insert.executeUpdate();
                }
            }
        } catch (Exception e) {
            throw new CustomChangeException("No se pudieron importar las plantillas built-in", e);
        }
    }

    private boolean alreadyImported(Connection connection, String key) throws Exception {
        try (PreparedStatement check = connection.prepareStatement(
                "SELECT 1 FROM email_template WHERE \"key\" = ?")) {
            check.setString(1, key);
            try (ResultSet rs = check.executeQuery()) {
                return rs.next();
            }
        }
    }

    private String readContent(String key) throws CustomChangeException {
        String path = "db/changelog/changes/109-import-data/" + key + ".html";
        try (InputStream in = resourceAccessor.openStream(null, path)) {
            if (in == null) {
                throw new CustomChangeException("No se encontró el recurso: " + path);
            }
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new CustomChangeException("Error leyendo " + path, e);
        }
    }
}
