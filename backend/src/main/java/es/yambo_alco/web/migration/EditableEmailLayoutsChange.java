package es.yambo_alco.web.migration;

import es.yambo_alco.web.util.EditableEmailDocument;
import liquibase.change.custom.CustomTaskChange;
import liquibase.database.Database;
import liquibase.database.jvm.JdbcConnection;
import liquibase.exception.CustomChangeException;
import liquibase.exception.ValidationErrors;
import liquibase.resource.ResourceAccessor;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.UUID;

/** Upgrade existing bodies without overwriting their content or campaign envelope. */
public class EditableEmailLayoutsChange implements CustomTaskChange {
    public void execute(Database database) throws CustomChangeException {
        Connection connection = ((JdbcConnection) database.getConnection()).getUnderlyingConnection();
        try {
            for (String part : new String[]{"header", "footer"}) {
                String key = "automatic-" + part;
                try (var check = connection.prepareStatement("SELECT 1 FROM email_common_element WHERE element_key=?")) {
                    check.setString(1, key);
                    try (var rows = check.executeQuery()) {
                        if (rows.next()) continue;
                    }
                }
                try (var insert = connection.prepareStatement("INSERT INTO email_common_element (id,element_key,name,html,description,created_at,updated_at) VALUES (?,?,?,?,?,now(),now())")) {
                    insert.setString(1, UUID.randomUUID().toString().replace("-", "").substring(0, 8));
                    insert.setString(2, key);
                    insert.setString(3, part.equals("header") ? "Cabecera de correos automáticos" : "Pie de correos automáticos");
                    insert.setString(4, EditableEmailDocument.section(part));
                    insert.setString(5, "Sección editable de los correos automáticos; conserva las variables de marca de cada plantilla.");
                    insert.executeUpdate();
                }
            }
            var bodies = new ArrayList<String[]>();
            try (var statement = connection.prepareStatement("SELECT \"key\",body FROM email_template WHERE body IS NOT NULL"); var rows = statement.executeQuery()) {
                while (rows.next()) bodies.add(new String[]{rows.getString(1), rows.getString(2)});
            }
            for (String[] row : bodies) {
                String wrapped = EditableEmailDocument.wrap(row[1]);
                if (wrapped.equals(row[1])) continue;
                try (var update = connection.prepareStatement("UPDATE email_template SET body=?,updated_at=now() WHERE \"key\"=? AND body=?")) {
                    update.setString(1, wrapped); update.setString(2, row[0]); update.setString(3, row[1]);
                    if (update.executeUpdate() != 1) throw new IllegalStateException("Template changed during migration: " + row[0]);
                }
            }
        } catch (Exception e) { throw new CustomChangeException("Cannot migrate editable email layouts", e); }
    }
    public String getConfirmationMessage() { return "Email headers and footers are editable sections"; }
    public void setUp() {}
    public void setFileOpener(ResourceAccessor accessor) {}
    public ValidationErrors validate(Database database) { return new ValidationErrors(); }
}
