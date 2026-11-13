package es.yambo_alco.web.migration;

import es.yambo_alco.web.util.EditableEmailDocument;
import liquibase.change.custom.CustomTaskChange;
import liquibase.database.Database;
import liquibase.database.jvm.JdbcConnection;
import liquibase.exception.CustomChangeException;
import liquibase.exception.ValidationErrors;
import liquibase.resource.ResourceAccessor;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Upgrade existing bodies without overwriting their content or campaign envelope. */
public class EditableEmailLayoutsChange implements CustomTaskChange {
    private record StoredTemplate(String key, String body) {}

    @Override
    public void execute(Database database) throws CustomChangeException {
        Connection connection = ((JdbcConnection) database.getConnection()).getUnderlyingConnection();
        try {
            insertMissingSection(connection, "header", "Cabecera de correos automáticos");
            insertMissingSection(connection, "footer", "Pie de correos automáticos");
            for (StoredTemplate template : readTemplates(connection)) {
                upgradeTemplate(connection, template);
            }
        } catch (Exception exception) {
            throw new CustomChangeException("Cannot migrate editable email layouts", exception);
        }
    }

    private void insertMissingSection(Connection connection, String section, String name) throws SQLException {
        String key = "automatic-" + section;
        try (var check = connection.prepareStatement("SELECT 1 FROM email_common_element WHERE element_key=?")) {
            check.setString(1, key);
            try (var rows = check.executeQuery()) {
                if (rows.next()) {
                    return;
                }
            }
        }
        String sql = "INSERT INTO email_common_element (id,element_key,name,html,description,created_at,updated_at) VALUES (?,?,?,?,?,now(),now())";
        try (var insert = connection.prepareStatement(sql)) {
            insert.setString(1, UUID.randomUUID().toString().replace("-", "").substring(0, 8));
            insert.setString(2, key);
            insert.setString(3, name);
            insert.setString(4, EditableEmailDocument.section(section));
            insert.setString(5, "Sección editable de los correos automáticos; conserva las variables de marca de cada plantilla.");
            insert.executeUpdate();
        }
    }

    private List<StoredTemplate> readTemplates(Connection connection) throws SQLException {
        List<StoredTemplate> templates = new ArrayList<>();
        String sql = "SELECT \"key\",body FROM email_template WHERE body IS NOT NULL";
        try (var statement = connection.prepareStatement(sql); var rows = statement.executeQuery()) {
            while (rows.next()) {
                templates.add(new StoredTemplate(rows.getString(1), rows.getString(2)));
            }
        }
        return templates;
    }

    private void upgradeTemplate(Connection connection, StoredTemplate template) throws SQLException {
        String wrapped = EditableEmailDocument.wrap(template.body());
        if (wrapped.equals(template.body())) {
            return;
        }
        String sql = "UPDATE email_template SET body=?,updated_at=now() WHERE \"key\"=? AND body=?";
        try (var update = connection.prepareStatement(sql)) {
            update.setString(1, wrapped);
            update.setString(2, template.key());
            update.setString(3, template.body());
            if (update.executeUpdate() != 1) {
                throw new IllegalStateException("Template changed during migration: " + template.key());
            }
        }
    }

    @Override
    public String getConfirmationMessage() {
        return "Email headers and footers are editable sections";
    }

    @Override
    public void setUp() {}

    @Override
    public void setFileOpener(ResourceAccessor accessor) {}

    @Override
    public ValidationErrors validate(Database database) {
        return new ValidationErrors();
    }
}
