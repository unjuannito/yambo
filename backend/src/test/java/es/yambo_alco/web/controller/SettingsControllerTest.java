package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.MailConfig;
import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.Settings;
import es.yambo_alco.web.service.SettingsService;
import es.yambo_alco.web.util.PermissionCheckService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = SettingsController.class)
@Import(TestSecurityConfig.class)
class SettingsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SettingsService settingsService;

    @MockitoBean
    private MailConfig mailConfig;

    @MockitoBean
    private PermissionCheckService permissionCheckService;

    @BeforeEach
    void setUp() {
        when(permissionCheckService.hasPermission(anyString(), anyString())).thenReturn(true);
    }

    @Test
    @WithMockUser
    void getAllSettings_WithPermission_ShouldReturnAllSettings() throws Exception {
        // Given
        Settings setting1 = Settings.builder()
                .id("SET00001")
                .key("test.key1")
                .value("value1")
                .description("Description 1")
                .category("test")
                .build();
        Settings setting2 = Settings.builder()
                .id("SET00002")
                .key("test.key2")
                .value("value2")
                .description("Description 2")
                .category("test")
                .build();

        when(settingsService.getAllSettings()).thenReturn(List.of(setting1, setting2));

        // When & Then
        mockMvc.perform(get("/admin/settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value("SET00001"))
                .andExpect(jsonPath("$[0].key").value("test.key1"))
                .andExpect(jsonPath("$[0].value").value("value1"))
                .andExpect(jsonPath("$[1].key").value("test.key2"));
    }

    @Test
    @WithMockUser
    void getSettingsByCategory_WithPermission_ShouldReturnCategorySettings() throws Exception {
        // Given
        Settings setting1 = Settings.builder()
                .id("SET00001")
                .key("email.host")
                .value("smtp.example.com")
                .category("email")
                .build();
        Settings setting2 = Settings.builder()
                .id("SET00002")
                .key("email.port")
                .value("587")
                .category("email")
                .build();

        when(settingsService.getSettingsByCategory("email")).thenReturn(List.of(setting1, setting2));

        // When & Then
        mockMvc.perform(get("/admin/settings/category/email"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].category").value("email"))
                .andExpect(jsonPath("$[1].category").value("email"));
    }

    @Test
    @WithMockUser
    void getSettingByKey_WithExistingKey_ShouldReturnSetting() throws Exception {
        // Given
        Settings setting = Settings.builder()
                .id("SET00001")
                .key("test.key")
                .value("test.value")
                .description("Test description")
                .category("test")
                .build();

        when(settingsService.getSettingByKey("test.key")).thenReturn(setting);

        // When & Then
        mockMvc.perform(get("/admin/settings/key/test.key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("SET00001"))
                .andExpect(jsonPath("$.key").value("test.key"))
                .andExpect(jsonPath("$.value").value("test.value"))
                .andExpect(jsonPath("$.description").value("Test description"));
    }

    @Test
    @WithMockUser
    void getSettingByKey_WithNonExistingKey_ShouldReturnNotFound() throws Exception {
        // Given
        when(settingsService.getSettingByKey("nonexistent.key"))
                .thenThrow(new ResourceNotFoundException("Setting not found with key: nonexistent.key"));

        // When & Then
        mockMvc.perform(get("/admin/settings/key/nonexistent.key"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    void createSetting_WithValidData_ShouldCreateSetting() throws Exception {
        // Given
        Settings setting = Settings.builder()
                .id("SET00001")
                .key("new.key")
                .value("new.value")
                .description("New description")
                .category("test")
                .build();

        when(settingsService.createSetting(eq("new.key"), eq("new.value"), eq("New description"), eq("test")))
                .thenReturn(setting);

        String requestBody = """
                {
                    "key": "new.key",
                    "value": "new.value",
                    "description": "New description",
                    "category": "test"
                }
                """;

        // When & Then
        mockMvc.perform(post("/admin/settings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("SET00001"))
                .andExpect(jsonPath("$.key").value("new.key"))
                .andExpect(jsonPath("$.value").value("new.value"));
    }

    @Test
    @WithMockUser
    void createSetting_WithExistingKey_ShouldReturnBadRequest() throws Exception {
        // Given
        when(settingsService.createSetting(eq("existing.key"), anyString(), anyString(), anyString()))
                .thenThrow(new BadRequestException("Setting with key 'existing.key' already exists"));

        String requestBody = """
                {
                    "key": "existing.key",
                    "value": "value",
                    "description": "description",
                    "category": "test"
                }
                """;

        // When & Then
        mockMvc.perform(post("/admin/settings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void createSetting_WithInvalidData_ShouldReturnBadRequest() throws Exception {
        // Given
        String requestBody = """
                {
                    "key": "",
                    "value": "value"
                }
                """;

        // When & Then
        mockMvc.perform(post("/admin/settings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void updateSetting_WithValidData_ShouldUpdateSetting() throws Exception {
        // Given
        Settings updatedSetting = Settings.builder()
                .id("SET00001")
                .key("test.key")
                .value("updated.value")
                .description("Updated description")
                .category("updated")
                .build();

        when(settingsService.updateSetting(eq("test.key"), eq("updated.value"), eq("Updated description"), eq("updated")))
                .thenReturn(updatedSetting);

        String requestBody = """
                {
                    "value": "updated.value",
                    "description": "Updated description",
                    "category": "updated"
                }
                """;

        // When & Then
        mockMvc.perform(put("/admin/settings/key/test.key")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.key").value("test.key"))
                .andExpect(jsonPath("$.value").value("updated.value"))
                .andExpect(jsonPath("$.description").value("Updated description"));
    }

    @Test
    @WithMockUser
    void updateSetting_WithNonExistingKey_ShouldReturnNotFound() throws Exception {
        // Given
        when(settingsService.updateSetting(eq("nonexistent.key"), eq("value"), isNull(), isNull()))
                .thenThrow(new ResourceNotFoundException("Setting not found with key: nonexistent.key"));

        String requestBody = """
                {
                    "value": "value"
                }
                """;

        // When & Then
        mockMvc.perform(put("/admin/settings/key/nonexistent.key")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    void updateSettingsBulk_WithValidData_ShouldUpdateAllSettings() throws Exception {
        // Given
        Settings setting1 = Settings.builder().key("key1").value("value1").build();
        Settings setting2 = Settings.builder().key("key2").value("value2").build();

        when(settingsService.upsertSetting(eq("key1"), eq("value1"))).thenReturn(setting1);
        when(settingsService.upsertSetting(eq("key2"), eq("value2"))).thenReturn(setting2);

        String requestBody = """
                {
                    "key1": "value1",
                    "key2": "value2"
                }
                """;

        // When & Then
        mockMvc.perform(put("/admin/settings/bulk")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(content().string("Settings updated successfully"));

        verify(settingsService).upsertSetting("key1", "value1");
        verify(settingsService).upsertSetting("key2", "value2");
    }

    @Test
    @WithMockUser
    void updateSettingsBulk_WithNewKey_ShouldCreateSetting() throws Exception {
        // Given
        Settings setting = Settings.builder().key("new.key").value("new.value").build();
        when(settingsService.upsertSetting(eq("new.key"), eq("new.value"))).thenReturn(setting);

        String requestBody = """
                {
                    "new.key": "new.value"
                }
                """;

        // When & Then
        mockMvc.perform(put("/admin/settings/bulk")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(content().string("Settings updated successfully"));

        verify(settingsService).upsertSetting("new.key", "new.value");
    }

    @Test
    @WithMockUser
    void deleteSetting_WithExistingKey_ShouldDeleteSetting() throws Exception {
        // Given
        doNothing().when(settingsService).deleteSetting("test.key");

        // When & Then
        mockMvc.perform(delete("/admin/settings/key/test.key"))
                .andExpect(status().isOk())
                .andExpect(content().string("Setting deleted successfully"));

        verify(settingsService).deleteSetting("test.key");
    }

    @Test
    @WithMockUser
    void deleteSetting_WithNonExistingKey_ShouldReturnNotFound() throws Exception {
        // Given
        doThrow(new ResourceNotFoundException("Setting not found with key: nonexistent.key"))
                .when(settingsService).deleteSetting("nonexistent.key");

        // When & Then
        mockMvc.perform(delete("/admin/settings/key/nonexistent.key"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    void getIban_ShouldReturnIbanValue() throws Exception {
        // Given
        when(settingsService.getIban()).thenReturn("ES1234567890123456789012");

        // When & Then
        mockMvc.perform(get("/admin/settings/bank/iban"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.iban").value("ES1234567890123456789012"));
    }

    @Test
    @WithMockUser
    void setIban_WithValidData_ShouldUpdateIban() throws Exception {
        // Given
        doNothing().when(settingsService).setIban("ES1234567890123456789012");

        String requestBody = """
                {
                    "iban": "ES1234567890123456789012"
                }
                """;

        // When & Then
        mockMvc.perform(put("/admin/settings/bank/iban")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(content().string("IBAN updated successfully"));

        verify(settingsService).setIban("ES1234567890123456789012");
    }

    @Test
    @WithMockUser
    void setIban_WithInvalidData_ShouldReturnBadRequest() throws Exception {
        // Given
        String requestBody = """
                {
                    "iban": ""
                }
                """;

        // When & Then
        mockMvc.perform(put("/admin/settings/bank/iban")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void getEmailConfig_ShouldReturnEmailConfiguration() throws Exception {
        // Given
        when(settingsService.getEmailHost()).thenReturn("smtp.example.com");
        when(settingsService.getEmailPort()).thenReturn("587");
        when(settingsService.getEmailUsername()).thenReturn("user@example.com");
        when(settingsService.getEmailFrom()).thenReturn("noreply@example.com");
        when(settingsService.getEmailFromName()).thenReturn("Yambo");

        // When & Then
        mockMvc.perform(get("/admin/settings/email"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.host").value("smtp.example.com"))
                .andExpect(jsonPath("$.port").value("587"))
                .andExpect(jsonPath("$.username").value("user@example.com"))
                .andExpect(jsonPath("$.from").value("noreply@example.com"))
                .andExpect(jsonPath("$.fromName").value("Yambo"))
                .andExpect(jsonPath("$.password").value(""));
    }

    @Test
    @WithMockUser
    void updateEmailConfig_WithValidData_ShouldUpdateConfiguration() throws Exception {
        // Given
        doNothing().when(settingsService).setEmailHost("smtp.new.com");
        doNothing().when(settingsService).setEmailPort("465");
        doNothing().when(settingsService).setEmailUsername("newuser@example.com");
        doNothing().when(settingsService).setEmailPassword("newpassword");
        doNothing().when(settingsService).setEmailFrom("new@example.com");
        doNothing().when(settingsService).setEmailFromName("New Yambo");

        String requestBody = """
                {
                    "host": "smtp.new.com",
                    "port": "465",
                    "username": "newuser@example.com",
                    "password": "newpassword",
                    "from": "new@example.com",
                    "fromName": "New Yambo"
                }
                """;

        // When & Then
        mockMvc.perform(put("/admin/settings/email")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(content().string("Email configuration updated successfully"));

        verify(settingsService).setEmailHost("smtp.new.com");
        verify(settingsService).setEmailPort("465");
        verify(settingsService).setEmailUsername("newuser@example.com");
        verify(settingsService).setEmailPassword("newpassword");
        verify(settingsService).setEmailFrom("new@example.com");
        verify(settingsService).setEmailFromName("New Yambo");
    }

    @Test
    @WithMockUser
    void updateEmailConfig_WithPartialData_ShouldUpdateOnlyProvidedFields() throws Exception {
        // Given
        doNothing().when(settingsService).setEmailHost("smtp.new.com");

        String requestBody = """
                {
                    "host": "smtp.new.com"
                }
                """;

        // When & Then
        mockMvc.perform(put("/admin/settings/email")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(content().string("Email configuration updated successfully"));

        verify(settingsService).setEmailHost("smtp.new.com");
        verify(settingsService, never()).setEmailPort(anyString());
        verify(settingsService, never()).setEmailUsername(anyString());
    }

    @Test
    @WithMockUser
    void updateEmailConfig_WithBlankValues_ShouldNotUpdate() throws Exception {
        // Given
        String requestBody = """
                {
                    "host": "",
                    "port": "  ",
                    "username": "user@example.com"
                }
                """;

        // When & Then
        mockMvc.perform(put("/admin/settings/email")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk());

        verify(settingsService, never()).setEmailHost(anyString());
        verify(settingsService, never()).setEmailPort(anyString());
        verify(settingsService).setEmailUsername("user@example.com");
    }

    @Test
    @WithMockUser
    void getSmtpAdvancedConfig_ShouldReturnSmtpConfiguration() throws Exception {
        // Given
        when(settingsService.getEmailSmtpAuth()).thenReturn(true);
        when(settingsService.getEmailSmtpStartTlsEnable()).thenReturn(true);
        when(settingsService.getEmailSmtpStartTlsRequired()).thenReturn(false);
        when(settingsService.getEmailSmtpConnectionTimeout()).thenReturn(5000);
        when(settingsService.getEmailSmtpTimeout()).thenReturn(5000);
        when(settingsService.getEmailSmtpWriteTimeout()).thenReturn(5000);

        // When & Then
        mockMvc.perform(get("/admin/settings/email/smtp"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.auth").value(true))
                .andExpect(jsonPath("$.starttlsEnable").value(true))
                .andExpect(jsonPath("$.starttlsRequired").value(false))
                .andExpect(jsonPath("$.connectionTimeout").value(5000))
                .andExpect(jsonPath("$.timeout").value(5000))
                .andExpect(jsonPath("$.writeTimeout").value(5000));
    }

    @Test
    @WithMockUser
    void updateSmtpAdvancedConfig_WithValidData_ShouldUpdateConfiguration() throws Exception {
        // Given
        doNothing().when(settingsService).setEmailSmtpAuth(true);
        doNothing().when(settingsService).setEmailSmtpStartTlsEnable(true);
        doNothing().when(settingsService).setEmailSmtpStartTlsRequired(true);
        doNothing().when(settingsService).setEmailSmtpConnectionTimeout(10000);
        doNothing().when(settingsService).setEmailSmtpTimeout(10000);
        doNothing().when(settingsService).setEmailSmtpWriteTimeout(10000);

        String requestBody = """
                {
                    "auth": true,
                    "starttlsEnable": true,
                    "starttlsRequired": true,
                    "connectionTimeout": 10000,
                    "timeout": 10000,
                    "writeTimeout": 10000
                }
                """;

        // When & Then
        mockMvc.perform(put("/admin/settings/email/smtp")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(content().string("SMTP advanced configuration updated successfully"));

        verify(settingsService).setEmailSmtpAuth(true);
        verify(settingsService).setEmailSmtpStartTlsEnable(true);
        verify(settingsService).setEmailSmtpStartTlsRequired(true);
        verify(settingsService).setEmailSmtpConnectionTimeout(10000);
        verify(settingsService).setEmailSmtpTimeout(10000);
        verify(settingsService).setEmailSmtpWriteTimeout(10000);
    }

    @Test
    @WithMockUser
    void updateSmtpAdvancedConfig_WithPartialData_ShouldUpdateOnlyProvidedFields() throws Exception {
        // Given
        doNothing().when(settingsService).setEmailSmtpAuth(false);
        doNothing().when(settingsService).setEmailSmtpConnectionTimeout(8000);

        String requestBody = """
                {
                    "auth": false,
                    "connectionTimeout": 8000
                }
                """;

        // When & Then
        mockMvc.perform(put("/admin/settings/email/smtp")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(content().string("SMTP advanced configuration updated successfully"));

        verify(settingsService).setEmailSmtpAuth(false);
        verify(settingsService).setEmailSmtpConnectionTimeout(8000);
        verify(settingsService, never()).setEmailSmtpStartTlsEnable(anyBoolean());
        verify(settingsService, never()).setEmailSmtpTimeout(anyInt());
    }

    @Test
    @WithMockUser
    void getDomain_ShouldReturnDomainValue() throws Exception {
        // Given
        when(settingsService.getDomain()).thenReturn("https://yambo-alco.es");

        // When & Then
        mockMvc.perform(get("/admin/settings/app/domain"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.domain").value("https://yambo-alco.es"));
    }

    @Test
    @WithMockUser
    void setDomain_WithValidData_ShouldUpdateDomain() throws Exception {
        // Given
        doNothing().when(settingsService).setDomain("https://yambo-alco.es");

        String requestBody = """
                {
                    "domain": "https://yambo-alco.es"
                }
                """;

        // When & Then
        mockMvc.perform(put("/admin/settings/app/domain")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(content().string("Domain updated successfully"));

        verify(settingsService).setDomain("https://yambo-alco.es");
    }

    @Test
    @WithMockUser
    void setDomain_WithInvalidData_ShouldReturnBadRequest() throws Exception {
        // Given
        String requestBody = """
                {
                    "domain": ""
                }
                """;

        // When & Then
        mockMvc.perform(put("/admin/settings/app/domain")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isBadRequest());
    }

        @Test
        @WithMockUser
        void getIssueCreationWindowDays_ShouldReturnValue() throws Exception {
                when(settingsService.getIssueCreationWindowDays()).thenReturn(30);

                mockMvc.perform(get("/admin/settings/issues/creation-window-days"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.days").value(30));
        }

        @Test
        @WithMockUser
        void setIssueCreationWindowDays_WithValidData_ShouldUpdateValue() throws Exception {
                doNothing().when(settingsService).setIssueCreationWindowDays(15);

                String requestBody = """
                                {
                                        "days": 15
                                }
                                """;

                mockMvc.perform(put("/admin/settings/issues/creation-window-days")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isOk())
                                .andExpect(content().string("Issue creation window updated successfully"));

                verify(settingsService).setIssueCreationWindowDays(15);
        }

        @Test
        @WithMockUser
        void setIssueCreationWindowDays_WithMissingValue_ShouldReturnBadRequest() throws Exception {
                String requestBody = """
                                {
                                }
                                """;

                mockMvc.perform(put("/admin/settings/issues/creation-window-days")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isBadRequest());
        }

    // ── Upload Settings Tests ──

    @Test
    @WithMockUser
    void getUploadConfig_ShouldReturnUploadConfiguration() throws Exception {
        // Given
        when(settingsService.getUploadMaxFileSizeMb()).thenReturn(5);

        // When & Then
        mockMvc.perform(get("/admin/settings/upload"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.maxFileSizeMb").value(5));
    }

    @Test
    @WithMockUser
    void updateUploadConfig_WithValidData_ShouldUpdateConfiguration() throws Exception {
        // Given
        doNothing().when(settingsService).setUploadMaxFileSizeMb(10);

        String requestBody = """
                {
                    "maxFileSizeMb": 10
                }
                """;

        // When & Then
        mockMvc.perform(put("/admin/settings/upload")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(content().string("Upload configuration updated successfully"));

        verify(settingsService).setUploadMaxFileSizeMb(10);
    }

    @Test
    @WithMockUser
    void updateUploadConfig_WithEmptyBody_ShouldNotUpdateAnything() throws Exception {
        // Given
        String requestBody = """
                {}
                """;

        // When & Then
        mockMvc.perform(put("/admin/settings/upload")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk());

        verify(settingsService, never()).setUploadMaxFileSizeMb(anyInt());
    }
}
