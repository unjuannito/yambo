package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.Settings;
import es.yambo_alco.web.repository.SettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SettingsService {

    private static final String ISSUE_CREATION_WINDOW_DAYS_KEY = "issues.creation_window_days";
    private static final int DEFAULT_ISSUE_CREATION_WINDOW_DAYS = 30;

    private final SettingsRepository settingsRepository;

    public List<Settings> getAllSettings() {
        return settingsRepository.findAll();
    }

    public List<Settings> getSettingsByCategory(String category) {
        return settingsRepository.findByCategory(category);
    }

    public Settings getSettingByKey(@NonNull String key) {
        return settingsRepository.findByKey(key)
                .orElseThrow(() -> new ResourceNotFoundException("Setting not found with key: " + key));
    }

    public Optional<Settings> findSettingByKey(@NonNull String key) {
        return settingsRepository.findByKey(key);
    }

    public String getSettingValue(@NonNull String key, String defaultValue) {
        return settingsRepository.findByKey(key)
                .map(Settings::getValue)
                .orElse(defaultValue);
    }

    public Settings createSetting(@NonNull String key, String value, String description, String category) {
        if (settingsRepository.findByKey(key).isPresent()) {
            throw new BadRequestException("Setting with key '" + key + "' already exists");
        }

        Settings setting = Settings.builder()
                .key(key)
                .value(value)
                .description(description)
                .category(category)
                .build();

        return settingsRepository.save(setting);
    }

    public Settings updateSetting(@NonNull String key, String value, String description, String category) {
        Settings setting = settingsRepository.findByKey(key)
                .orElseThrow(() -> new ResourceNotFoundException("Setting not found with key: " + key));

        if (value != null) {
            setting.setValue(value);
        }
        if (description != null) {
            setting.setDescription(description);
        }
        if (category != null) {
            setting.setCategory(category);
        }

        return settingsRepository.save(setting);
    }

    public Settings upsertSetting(@NonNull String key, String value) {
        return settingsRepository.findByKey(key)
                .map(setting -> {
                    setting.setValue(value);
                    return settingsRepository.save(setting);
                })
                .orElseGet(() -> {
                    Settings setting = Settings.builder()
                            .key(key)
                            .value(value)
                            .build();
                    return settingsRepository.save(setting);
                });
    }

    public void deleteSetting(@NonNull String key) {
        Settings setting = settingsRepository.findByKey(key)
                .orElseThrow(() -> new ResourceNotFoundException("Setting not found with key: " + key));
        settingsRepository.delete(setting);
    }

    public String getDomain() {
        return getSettingValue("app.domain", "http://localhost");
    }

    public void setDomain(@NonNull String domain) {
        Optional<Settings> existing = findSettingByKey("app.domain");
        if (existing.isPresent()) {
            updateSetting("app.domain", domain, null, null);
        } else {
            createSetting("app.domain", domain, "Dominio de la aplicación para enlaces en correos", "app");
        }
    }

    public String getFrontendUrl() {
        return getSettingValue("app.frontend_url", "http://localhost:5173");
    }

    public void setFrontendUrl(@NonNull String frontendUrl) {
        Optional<Settings> existing = findSettingByKey("app.frontend_url");
        if (existing.isPresent()) {
            updateSetting("app.frontend_url", frontendUrl, null, null);
        } else {
            createSetting("app.frontend_url", frontendUrl, "URL del frontend de la aplicación", "app");
        }
    }

    public String getIban() {
        return getSettingValue("bank.iban", "");
    }

    public void setIban(@NonNull String iban) {
        Optional<Settings> existing = findSettingByKey("bank.iban");
        if (existing.isPresent()) {
            updateSetting("bank.iban", iban, null, null);
        } else {
            createSetting("bank.iban", iban, "IBAN de la cuenta bancaria de la asociación", "bank");
        }
    }

    public String getOrganizationLegalName() {
        return getSettingValue("organization.legal_name", "Yambo ALCO");
    }

    public void setOrganizationLegalName(@NonNull String legalName) {
        Optional<Settings> existing = findSettingByKey("organization.legal_name");
        if (existing.isPresent()) {
            updateSetting("organization.legal_name", legalName, null, null);
        } else {
            createSetting("organization.legal_name", legalName, "Nombre legal de la organización", "organization");
        }
    }

    public String getOrganizationName() {
        return getSettingValue("organization.name", "Yambo");
    }

    public void setOrganizationName(@NonNull String name) {
        Optional<Settings> existing = findSettingByKey("organization.name");
        if (existing.isPresent()) {
            updateSetting("organization.name", name, null, null);
        } else {
            createSetting("organization.name", name, "Nombre corto de la organización (usado en correos)", "organization");
        }
    }

    public String getEmailHost() {
        return getSettingValue("email.host", "");
    }

    public void setEmailHost(@NonNull String host) {
        Optional<Settings> existing = findSettingByKey("email.host");
        if (existing.isPresent()) {
            updateSetting("email.host", host, null, null);
        } else {
            createSetting("email.host", host, "Servidor SMTP para envío de correos", "email");
        }
    }

    public String getEmailPort() {
        return getSettingValue("email.port", "587");
    }

    public void setEmailPort(@NonNull String port) {
        Optional<Settings> existing = findSettingByKey("email.port");
        if (existing.isPresent()) {
            updateSetting("email.port", port, null, null);
        } else {
            createSetting("email.port", port, "Puerto SMTP", "email");
        }
    }

    public String getEmailUsername() {
        return getSettingValue("email.username", "");
    }

    public void setEmailUsername(@NonNull String username) {
        Optional<Settings> existing = findSettingByKey("email.username");
        if (existing.isPresent()) {
            updateSetting("email.username", username, null, null);
        } else {
            createSetting("email.username", username, "Usuario SMTP", "email");
        }
    }

    public String getEmailPassword() {
        return getSettingValue("email.password", "");
    }

    public void setEmailPassword(@NonNull String password) {
        Optional<Settings> existing = findSettingByKey("email.password");
        if (existing.isPresent()) {
            updateSetting("email.password", password, null, null);
        } else {
            createSetting("email.password", password, "Contraseña SMTP", "email");
        }
    }

    public String getEmailFrom() {
        return getSettingValue("email.from", "");
    }

    public void setEmailFrom(@NonNull String from) {
        Optional<Settings> existing = findSettingByKey("email.from");
        if (existing.isPresent()) {
            updateSetting("email.from", from, null, null);
        } else {
            createSetting("email.from", from, "Dirección de correo del remitente", "email");
        }
    }

    public String getEmailFromName() {
        return getSettingValue("email.from.name", "Yambo");
    }

    public void setEmailFromName(@NonNull String fromName) {
        Optional<Settings> existing = findSettingByKey("email.from.name");
        if (existing.isPresent()) {
            updateSetting("email.from.name", fromName, null, null);
        } else {
            createSetting("email.from.name", fromName, "Nombre del remitente de correos", "email");
        }
    }

    public boolean getEmailSmtpAuth() {
        return Boolean.parseBoolean(getSettingValue("email.smtp.auth", "true"));
    }

    public void setEmailSmtpAuth(boolean auth) {
        Optional<Settings> existing = findSettingByKey("email.smtp.auth");
        String value = String.valueOf(auth);
        if (existing.isPresent()) {
            updateSetting("email.smtp.auth", value, null, null);
        } else {
            createSetting("email.smtp.auth", value, "Habilitar autenticación SMTP", "email");
        }
    }

    public boolean getEmailSmtpStartTlsEnable() {
        return Boolean.parseBoolean(getSettingValue("email.smtp.starttls.enable", "true"));
    }

    public void setEmailSmtpStartTlsEnable(boolean enable) {
        Optional<Settings> existing = findSettingByKey("email.smtp.starttls.enable");
        String value = String.valueOf(enable);
        if (existing.isPresent()) {
            updateSetting("email.smtp.starttls.enable", value, null, null);
        } else {
            createSetting("email.smtp.starttls.enable", value, "Habilitar STARTTLS para conexión segura", "email");
        }
    }

    public boolean getEmailSmtpStartTlsRequired() {
        return Boolean.parseBoolean(getSettingValue("email.smtp.starttls.required", "true"));
    }

    public void setEmailSmtpStartTlsRequired(boolean required) {
        Optional<Settings> existing = findSettingByKey("email.smtp.starttls.required");
        String value = String.valueOf(required);
        if (existing.isPresent()) {
            updateSetting("email.smtp.starttls.required", value, null, null);
        } else {
            createSetting("email.smtp.starttls.required", value, "Requerir STARTTLS", "email");
        }
    }

    public int getEmailSmtpConnectionTimeout() {
        return Integer.parseInt(getSettingValue("email.smtp.connectiontimeout", "5000"));
    }

    public void setEmailSmtpConnectionTimeout(int timeout) {
        Optional<Settings> existing = findSettingByKey("email.smtp.connectiontimeout");
        String value = String.valueOf(timeout);
        if (existing.isPresent()) {
            updateSetting("email.smtp.connectiontimeout", value, null, null);
        } else {
            createSetting("email.smtp.connectiontimeout", value, "Tiempo máximo de conexión SMTP en milisegundos",
                    "email");
        }
    }

    public int getEmailSmtpTimeout() {
        return Integer.parseInt(getSettingValue("email.smtp.timeout", "5000"));
    }

    public void setEmailSmtpTimeout(int timeout) {
        Optional<Settings> existing = findSettingByKey("email.smtp.timeout");
        String value = String.valueOf(timeout);
        if (existing.isPresent()) {
            updateSetting("email.smtp.timeout", value, null, null);
        } else {
            createSetting("email.smtp.timeout", value, "Tiempo máximo de espera SMTP en milisegundos", "email");
        }
    }

    public int getEmailSmtpWriteTimeout() {
        return Integer.parseInt(getSettingValue("email.smtp.writetimeout", "5000"));
    }

    public void setEmailSmtpWriteTimeout(int timeout) {
        Optional<Settings> existing = findSettingByKey("email.smtp.writetimeout");
        String value = String.valueOf(timeout);
        if (existing.isPresent()) {
            updateSetting("email.smtp.writetimeout", value, null, null);
        } else {
            createSetting("email.smtp.writetimeout", value, "Tiempo máximo de escritura SMTP en milisegundos", "email");
        }
    }

    public int getIssueCreationWindowDays() {
        String value = getSettingValue(ISSUE_CREATION_WINDOW_DAYS_KEY,
                String.valueOf(DEFAULT_ISSUE_CREATION_WINDOW_DAYS));
        try {
            int days = Integer.parseInt(value);
            if (days < 0) {
                return DEFAULT_ISSUE_CREATION_WINDOW_DAYS;
            }
            return days;
        } catch (NumberFormatException e) {
            return DEFAULT_ISSUE_CREATION_WINDOW_DAYS;
        }
    }

    public void setIssueCreationWindowDays(int days) {
        if (days < 0) {
            throw new BadRequestException("Issue creation window days must be 0 or greater");
        }

        Optional<Settings> existing = findSettingByKey(ISSUE_CREATION_WINDOW_DAYS_KEY);
        String value = String.valueOf(days);
        if (existing.isPresent()) {
            updateSetting(ISSUE_CREATION_WINDOW_DAYS_KEY, value, null, null);
        } else {
            createSetting(
                    ISSUE_CREATION_WINDOW_DAYS_KEY,
                    value,
                    "Días máximos para crear incidencias tras el cierre de un pedido",
                    "issues");
        }
    }
}
