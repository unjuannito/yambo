package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.Settings;
import es.yambo_alco.web.service.SettingsService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final SettingsService settingsService;

    @GetMapping
    @PreAuthorize("@permissionCheck.hasPermission('settings', 'read')")
    public ResponseEntity<List<SettingsResponse>> getAllSettings() {
        List<Settings> settings = settingsService.getAllSettings();
        return ResponseEntity.ok(settings.stream()
                .map(SettingsResponse::new)
                .toList());
    }

    @GetMapping("/category/{category}")
    @PreAuthorize("@permissionCheck.hasPermission('settings', 'read')")
    public ResponseEntity<List<SettingsResponse>> getSettingsByCategory(@PathVariable String category) {
        List<Settings> settings = settingsService.getSettingsByCategory(category);
        return ResponseEntity.ok(settings.stream()
                .map(SettingsResponse::new)
                .toList());
    }

    @GetMapping("/key/{key}")
    @PreAuthorize("@permissionCheck.hasPermission('settings', 'read')")
    public ResponseEntity<SettingsResponse> getSettingByKey(@PathVariable String key) {
        Settings setting = settingsService.getSettingByKey(key);
        return ResponseEntity.ok(new SettingsResponse(setting));
    }

    @PostMapping
    @PreAuthorize("@permissionCheck.hasPermission('settings', 'create')")
    public ResponseEntity<SettingsResponse> createSetting(@Valid @RequestBody CreateSettingRequest request) {
        Settings setting = settingsService.createSetting(
                request.getKey(),
                request.getValue(),
                request.getDescription(),
                request.getCategory());
        return ResponseEntity.ok(new SettingsResponse(setting));
    }

    @PutMapping("/key/{key}")
    @PreAuthorize("@permissionCheck.hasPermission('settings', 'update')")
    public ResponseEntity<SettingsResponse> updateSetting(
            @PathVariable String key,
            @Valid @RequestBody UpdateSettingRequest request) {
        Settings setting = settingsService.updateSetting(
                key,
                request.getValue(),
                request.getDescription(),
                request.getCategory());
        return ResponseEntity.ok(new SettingsResponse(setting));
    }

    @PutMapping("/bulk")
    @PreAuthorize("@permissionCheck.hasPermission('settings', 'update')")
    public ResponseEntity<String> updateSettingsBulk(@Valid @RequestBody Map<String, String> settings) {
        for (Map.Entry<String, String> entry : settings.entrySet()) {
            try {
                settingsService.updateSetting(entry.getKey(), entry.getValue(), null, null);
            } catch (Exception e) {
                return ResponseEntity.badRequest().body("Error updating setting: " + entry.getKey());
            }
        }
        return ResponseEntity.ok("Settings updated successfully");
    }

    @DeleteMapping("/key/{key}")
    @PreAuthorize("@permissionCheck.hasPermission('settings', 'delete')")
    public ResponseEntity<String> deleteSetting(@PathVariable String key) {
        settingsService.deleteSetting(key);
        return ResponseEntity.ok("Setting deleted successfully");
    }

    @GetMapping("/app/domain")
    @PreAuthorize("@permissionCheck.hasPermission('settings', 'read')")
    public ResponseEntity<Map<String, String>> getDomain() {
        return ResponseEntity.ok(Map.of("domain", settingsService.getDomain()));
    }

    @PutMapping("/app/domain")
    @PreAuthorize("@permissionCheck.hasPermission('settings', 'update')")
    public ResponseEntity<String> setDomain(@Valid @RequestBody DomainRequest request) {
        settingsService.setDomain(request.getDomain());
        return ResponseEntity.ok("Domain updated successfully");
    }

    @GetMapping("/bank/iban")
    @PreAuthorize("@permissionCheck.hasPermission('settings', 'read')")
    public ResponseEntity<Map<String, String>> getIban() {
        return ResponseEntity.ok(Map.of("iban", settingsService.getIban()));
    }

    @PutMapping("/bank/iban")
    @PreAuthorize("@permissionCheck.hasPermission('settings', 'update')")
    public ResponseEntity<String> setIban(@Valid @RequestBody IbanRequest request) {
        settingsService.setIban(request.getIban());
        return ResponseEntity.ok("IBAN updated successfully");
    }

    @GetMapping("/email")
    @PreAuthorize("@permissionCheck.hasPermission('settings', 'read')")
    public ResponseEntity<EmailConfigResponse> getEmailConfig() {
        EmailConfigResponse config = new EmailConfigResponse();
        config.setHost(settingsService.getEmailHost());
        config.setPort(settingsService.getEmailPort());
        config.setUsername(settingsService.getEmailUsername());
        config.setFrom(settingsService.getEmailFrom());
        config.setFromName(settingsService.getEmailFromName());
        config.setPassword("");
        return ResponseEntity.ok(config);
    }

    @PutMapping("/email")
    @PreAuthorize("@permissionCheck.hasPermission('settings', 'update')")
    public ResponseEntity<String> updateEmailConfig(@Valid @RequestBody EmailConfigRequest request) {
        if (request.getHost() != null && !request.getHost().isBlank()) {
            settingsService.setEmailHost(request.getHost());
        }
        if (request.getPort() != null && !request.getPort().isBlank()) {
            settingsService.setEmailPort(request.getPort());
        }
        if (request.getUsername() != null && !request.getUsername().isBlank()) {
            settingsService.setEmailUsername(request.getUsername());
        }
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            settingsService.setEmailPassword(request.getPassword());
        }
        if (request.getFrom() != null && !request.getFrom().isBlank()) {
            settingsService.setEmailFrom(request.getFrom());
        }
        if (request.getFromName() != null && !request.getFromName().isBlank()) {
            settingsService.setEmailFromName(request.getFromName());
        }
        return ResponseEntity.ok("Email configuration updated successfully");
    }

    @GetMapping("/email/smtp")
    @PreAuthorize("@permissionCheck.hasPermission('settings', 'read')")
    public ResponseEntity<SmtpAdvancedConfigResponse> getSmtpAdvancedConfig() {
        SmtpAdvancedConfigResponse config = new SmtpAdvancedConfigResponse();
        config.setAuth(settingsService.getEmailSmtpAuth());
        config.setStarttlsEnable(settingsService.getEmailSmtpStartTlsEnable());
        config.setStarttlsRequired(settingsService.getEmailSmtpStartTlsRequired());
        config.setConnectionTimeout(settingsService.getEmailSmtpConnectionTimeout());
        config.setTimeout(settingsService.getEmailSmtpTimeout());
        config.setWriteTimeout(settingsService.getEmailSmtpWriteTimeout());
        return ResponseEntity.ok(config);
    }

    @PutMapping("/email/smtp")
    @PreAuthorize("@permissionCheck.hasPermission('settings', 'update')")
    public ResponseEntity<String> updateSmtpAdvancedConfig(@Valid @RequestBody SmtpAdvancedConfigRequest request) {
        if (request.getAuth() != null) {
            settingsService.setEmailSmtpAuth(request.getAuth());
        }
        if (request.getStarttlsEnable() != null) {
            settingsService.setEmailSmtpStartTlsEnable(request.getStarttlsEnable());
        }
        if (request.getStarttlsRequired() != null) {
            settingsService.setEmailSmtpStartTlsRequired(request.getStarttlsRequired());
        }
        if (request.getConnectionTimeout() != null) {
            settingsService.setEmailSmtpConnectionTimeout(request.getConnectionTimeout());
        }
        if (request.getTimeout() != null) {
            settingsService.setEmailSmtpTimeout(request.getTimeout());
        }
        if (request.getWriteTimeout() != null) {
            settingsService.setEmailSmtpWriteTimeout(request.getWriteTimeout());
        }
        return ResponseEntity.ok("SMTP advanced configuration updated successfully");
    }

    @GetMapping("/issues/creation-window-days")
    @PreAuthorize("@permissionCheck.hasPermission('settings', 'read')")
    public ResponseEntity<Map<String, Integer>> getIssueCreationWindowDays() {
        return ResponseEntity.ok(Map.of("days", settingsService.getIssueCreationWindowDays()));
    }

    @PutMapping("/issues/creation-window-days")
    @PreAuthorize("@permissionCheck.hasPermission('settings', 'update')")
    public ResponseEntity<String> setIssueCreationWindowDays(
            @Valid @RequestBody IssueCreationWindowDaysRequest request) {
        settingsService.setIssueCreationWindowDays(request.getDays());
        return ResponseEntity.ok("Issue creation window updated successfully");
    }

    @Data
    public static class SettingsResponse {
        private String id;
        private String key;
        private String value;
        private String description;
        private String category;

        public SettingsResponse(Settings settings) {
            this.id = settings.getId();
            this.key = settings.getKey();
            this.value = settings.getValue();
            this.description = settings.getDescription();
            this.category = settings.getCategory();
        }
    }

    @Data
    public static class CreateSettingRequest {
        @NotBlank(message = "Key cannot be blank")
        private String key;

        private String value;
        private String description;
        private String category;
    }

    @Data
    public static class UpdateSettingRequest {
        private String value;
        private String description;
        private String category;
    }

    @Data
    public static class IbanRequest {
        @NotBlank(message = "IBAN cannot be blank")
        private String iban;
    }

    @Data
    public static class DomainRequest {
        @NotBlank(message = "Domain cannot be blank")
        private String domain;
    }

    @Data
    public static class EmailConfigRequest {
        private String host;
        private String port;
        private String username;
        private String password;
        private String from;
        private String fromName;
    }

    @Data
    public static class EmailConfigResponse {
        private String host;
        private String port;
        private String username;
        private String password;
        private String from;
        private String fromName;
    }

    @Data
    public static class SmtpAdvancedConfigRequest {
        private Boolean auth;
        private Boolean starttlsEnable;
        private Boolean starttlsRequired;
        private Integer connectionTimeout;
        private Integer timeout;
        private Integer writeTimeout;
    }

    @Data
    public static class SmtpAdvancedConfigResponse {
        private Boolean auth;
        private Boolean starttlsEnable;
        private Boolean starttlsRequired;
        private Integer connectionTimeout;
        private Integer timeout;
        private Integer writeTimeout;
    }

    @Data
    public static class IssueCreationWindowDaysRequest {
        @NotNull(message = "Days cannot be null")
        private Integer days;
    }
}
