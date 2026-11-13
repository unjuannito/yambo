package es.yambo_alco.web;

import liquibase.Contexts;
import liquibase.LabelExpression;
import liquibase.Liquibase;
import liquibase.database.Database;
import liquibase.database.DatabaseFactory;
import liquibase.database.jvm.JdbcConnection;
import liquibase.resource.ClassLoaderResourceAccessor;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Runs 109-email-template-import.xml in isolation against a bare H2
 * (PostgreSQL mode) database, directly via the Liquibase Java API (no
 * {@code @SpringBootTest} exists in this codebase to exercise the real
 * changelog end to end otherwise).
 * <p>
 * email_template is created here by hand with an explicitly double-quoted
 * lowercase "key" column — matching what real Postgres actually stores for
 * the pre-existing 107-email-templates.xml table (Postgres does not reserve
 * "key", so Liquibase's unquoted {@code <column name="key">} there folds to
 * plain lowercase {@code key}). H2 is NOT a faithful stand-in for that one
 * column: H2 treats KEY as a reserved word and Liquibase's own DDL generator
 * escapes it to uppercase there — a pre-existing, unrelated quirk of this
 * codebase's test tooling, not something to fix here. Hand-rolling the
 * column verifies what actually matters: that {@link es.yambo_alco.web.migration.ImportBuiltinEmailTemplatesChange}
 * inserts the 15 bodies (with embedded quotes, {@code ${...}} Thymeleaf
 * variables, etc.) correctly, independent of that H2/Postgres divergence.
 */
class Changelog109MigrationTest {

    private Connection connection;
    private Database database;

    @BeforeEach
    void setUp() throws Exception {
        String url = "jdbc:h2:mem:changelog109test_" + System.nanoTime() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1";
        connection = DriverManager.getConnection(url, "sa", "");
        try (Statement st = connection.createStatement()) {
            st.execute("CREATE TABLE profile (id CHAR(8) PRIMARY KEY, name VARCHAR(64) NOT NULL UNIQUE)");
            st.execute("CREATE TABLE permission (id CHAR(8) PRIMARY KEY, resource VARCHAR(64) NOT NULL, "
                    + "action VARCHAR(16) NOT NULL, has_condition BOOLEAN NOT NULL DEFAULT FALSE)");
            st.execute("CREATE TABLE profile_permission (profile_id CHAR(8) NOT NULL, permission_id CHAR(8) NOT NULL, "
                    + "PRIMARY KEY (profile_id, permission_id))");
            st.execute("CREATE TABLE email_template (\"key\" VARCHAR(80) PRIMARY KEY, subject TEXT, body TEXT, "
                    + "updated_by VARCHAR(80), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())");
            st.execute("INSERT INTO profile (id, name) VALUES ('ADMIN', 'Admin')");
        }
        database = DatabaseFactory.getInstance().findCorrectDatabaseImplementation(new JdbcConnection(connection));
    }

    @AfterEach
    void tearDown() throws Exception {
        connection.close();
    }

    private Liquibase newLiquibase() throws Exception {
        return new Liquibase("db/changelog/changes/109-email-template-import.xml",
                new ClassLoaderResourceAccessor(), database);
    }

    @Test
    void changelog109_ShouldApplyCleanlyAndImportEverything() throws Exception {
        newLiquibase().update(new Contexts(), new LabelExpression());

        try (Statement st = connection.createStatement()) {
            // 109-01: nuevas columnas
            ResultSet cols = st.executeQuery(
                    "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'EMAIL_TEMPLATE' "
                            + "AND column_name IN ('NAME', 'DESCRIPTION')");
            cols.next();
            assertEquals(2, cols.getInt(1), "name/description añadidas a email_template");

            // 109-02/03: email_common_element con header/footer sembrados
            ResultSet common = st.executeQuery("SELECT element_key, html FROM email_common_element ORDER BY element_key");
            int commonCount = 0;
            while (common.next()) {
                commonCount++;
                assertTrue(common.getString("html").contains("{{organizacion}}"),
                        "el HTML sembrado conserva el token: " + common.getString("element_key"));
            }
            assertEquals(2, commonCount, "header y footer sembrados");

            // 109-04: las 15 plantillas importadas
            ResultSet count = st.executeQuery("SELECT COUNT(*) FROM email_template WHERE \"key\" IN ("
                    + "'invitation','order-pending-payment','order-confirmed','order-in-progress',"
                    + "'order-delivered','order-confirming-payment','order-cancelled','order-admin-updated',"
                    + "'issue-created','issue-comment-added','issue-status-changed','issue-watcher-added',"
                    + "'password-reset','account-access','activity-open-registration')");
            count.next();
            assertEquals(15, count.getInt(1), "las 15 plantillas se importan");

            ResultSet row = st.executeQuery(
                    "SELECT subject, body, name FROM email_template WHERE \"key\" = 'order-confirmed'");
            assertTrue(row.next());
            assertNull(row.getString("subject"), "subject importado como NULL (el llamador computa el asunto)");
            String body = row.getString("body");
            assertTrue(body.contains("${userName}"), "el cuerpo conserva las variables Thymeleaf: " + body);
            assertTrue(body.contains("orderDetails") && body.contains("productTable") && body.contains("ctaButton"),
                    "los th:replace a los fragmentos compartidos sobreviven: " + body);
            assertEquals("Pago confirmado", row.getString("name"));

            // Contenido con comillas simples (p. ej. 'Ver mi pedido') no rompe el insert dollar-quoted
            ResultSet quoteCheck = st.executeQuery(
                    "SELECT body FROM email_template WHERE \"key\" = 'order-admin-updated'");
            assertTrue(quoteCheck.next());
            assertTrue(quoteCheck.getString("body").contains("Revisar mi pedido"));

            // 109-05/06: permisos EMAIL_COMMON concedidos a ADMIN
            ResultSet perms = st.executeQuery(
                    "SELECT COUNT(*) FROM profile_permission pp JOIN permission p ON p.id = pp.permission_id "
                            + "WHERE p.resource = 'EMAIL_COMMON' AND pp.profile_id = 'ADMIN'");
            perms.next();
            assertEquals(4, perms.getInt(1), "read + create + update + delete concedidos a ADMIN");
        }
    }

    @Test
    void changelog110_UpgradesLegacyBodiesWithoutReplacingCustomContent() throws Exception {
        newLiquibase().update(new Contexts(), new LabelExpression());
        try (var update = connection.prepareStatement("UPDATE email_template SET body=? WHERE \"key\"='invitation'")) {
            update.setString(1, "<p>Mi invitación personalizada</p>"); update.executeUpdate();
        }
        var upgrade = new Liquibase("db/changelog/changes/110-editable-email-layouts.xml", new ClassLoaderResourceAccessor(), database);
        upgrade.update(new Contexts(), new LabelExpression());
        upgrade.update(new Contexts(), new LabelExpression());
        try (var statement = connection.createStatement()) {
            var rows = statement.executeQuery("SELECT body FROM email_template WHERE \"key\"='invitation'");
            assertTrue(rows.next());
            String body = rows.getString(1);
            assertTrue(body.contains("Mi invitación personalizada"));
            assertTrue(es.yambo_alco.web.util.EditableEmailDocument.ownsLayout(body));
            assertEquals(1, body.split("data-ee-component=\"automatic-header\"", -1).length - 1);
            var components = statement.executeQuery("SELECT COUNT(*) FROM email_common_element");
            assertTrue(components.next()); assertEquals(4, components.getInt(1));
        }
    }

    @Test
    void changelog109_ShouldBeIdempotentOnSecondRun() throws Exception {
        Liquibase liquibase = newLiquibase();
        liquibase.update(new Contexts(), new LabelExpression());
        // Liquibase ya habría marcado estos changesets como ejecutados (DATABASECHANGELOG);
        // una segunda pasada no debe reintentar insertarlos ni fallar por clave duplicada.
        liquibase.update(new Contexts(), new LabelExpression());

        try (Statement st = connection.createStatement()) {
            ResultSet count = st.executeQuery("SELECT COUNT(*) FROM email_template");
            count.next();
            assertEquals(15, count.getInt(1));
        }
    }
}
