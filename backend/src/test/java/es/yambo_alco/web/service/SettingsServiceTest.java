package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.Settings;
import es.yambo_alco.web.repository.SettingsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class SettingsServiceTest {

    private SettingsRepository settingsRepository;
    private SettingsService settingsService;

    @BeforeEach
    public void setup() {
        settingsRepository = Mockito.mock(SettingsRepository.class);
        settingsService = new SettingsService(settingsRepository);
    }

    @Test
    public void getAllSettings_ShouldReturnAllSettings() {
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

        when(settingsRepository.findAll()).thenReturn(List.of(setting1, setting2));

        // When
        List<Settings> result = settingsService.getAllSettings();

        // Then
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getKey()).isEqualTo("test.key1");
        assertThat(result.get(1).getKey()).isEqualTo("test.key2");
        verify(settingsRepository).findAll();
    }

    @Test
    public void getSettingsByCategory_ShouldReturnSettingsInCategory() {
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

        when(settingsRepository.findByCategory("email")).thenReturn(List.of(setting1, setting2));

        // When
        List<Settings> result = settingsService.getSettingsByCategory("email");

        // Then
        assertThat(result).hasSize(2);
        assertThat(result).allMatch(s -> s.getCategory().equals("email"));
        verify(settingsRepository).findByCategory("email");
    }

    @Test
    public void getSettingByKey_WithExistingKey_ShouldReturnSetting() {
        // Given
        Settings setting = Settings.builder()
                .id("SET00001")
                .key("test.key")
                .value("test.value")
                .build();

        when(settingsRepository.findByKey("test.key")).thenReturn(Optional.of(setting));

        // When
        Settings result = settingsService.getSettingByKey("test.key");

        // Then
        assertThat(result.getKey()).isEqualTo("test.key");
        assertThat(result.getValue()).isEqualTo("test.value");
        verify(settingsRepository).findByKey("test.key");
    }

    @Test
    public void getSettingByKey_WithNonExistingKey_ShouldThrowException() {
        // Given
        when(settingsRepository.findByKey("nonexistent.key")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> settingsService.getSettingByKey("nonexistent.key"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Setting not found with key: nonexistent.key");
    }

    @Test
    public void findSettingByKey_WithExistingKey_ShouldReturnOptional() {
        // Given
        Settings setting = Settings.builder()
                .id("SET00001")
                .key("test.key")
                .value("test.value")
                .build();

        when(settingsRepository.findByKey("test.key")).thenReturn(Optional.of(setting));

        // When
        Optional<Settings> result = settingsService.findSettingByKey("test.key");

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getKey()).isEqualTo("test.key");
    }

    @Test
    public void findSettingByKey_WithNonExistingKey_ShouldReturnEmpty() {
        // Given
        when(settingsRepository.findByKey("nonexistent.key")).thenReturn(Optional.empty());

        // When
        Optional<Settings> result = settingsService.findSettingByKey("nonexistent.key");

        // Then
        assertThat(result).isEmpty();
    }

    @Test
    public void getSettingValue_WithExistingKey_ShouldReturnValue() {
        // Given
        Settings setting = Settings.builder()
                .id("SET00001")
                .key("test.key")
                .value("actual.value")
                .build();

        when(settingsRepository.findByKey("test.key")).thenReturn(Optional.of(setting));

        // When
        String result = settingsService.getSettingValue("test.key", "default.value");

        // Then
        assertThat(result).isEqualTo("actual.value");
    }

    @Test
    public void getSettingValue_WithNonExistingKey_ShouldReturnDefaultValue() {
        // Given
        when(settingsRepository.findByKey("nonexistent.key")).thenReturn(Optional.empty());

        // When
        String result = settingsService.getSettingValue("nonexistent.key", "default.value");

        // Then
        assertThat(result).isEqualTo("default.value");
    }

    @Test
    public void createSetting_WithNewKey_ShouldCreateSetting() {
        // Given
        Settings setting = Settings.builder()
                .id("SET00001")
                .key("new.key")
                .value("new.value")
                .description("New description")
                .category("test")
                .build();

        when(settingsRepository.findByKey("new.key")).thenReturn(Optional.empty());
        when(settingsRepository.save(any(Settings.class))).thenReturn(setting);

        // When
        Settings result = settingsService.createSetting("new.key", "new.value", "New description", "test");

        // Then
        assertThat(result.getKey()).isEqualTo("new.key");
        assertThat(result.getValue()).isEqualTo("new.value");
        verify(settingsRepository).save(any(Settings.class));
    }

    @Test
    public void createSetting_WithExistingKey_ShouldThrowException() {
        // Given
        Settings existingSetting = Settings.builder()
                .id("SET00001")
                .key("existing.key")
                .value("existing.value")
                .build();

        when(settingsRepository.findByKey("existing.key")).thenReturn(Optional.of(existingSetting));

        // When & Then
        assertThatThrownBy(() -> settingsService.createSetting("existing.key", "value", "description", "category"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Setting with key 'existing.key' already exists");

        verify(settingsRepository, never()).save(any(Settings.class));
    }

    @Test
    public void updateSetting_WithExistingKey_ShouldUpdateSetting() {
        // Given
        Settings existingSetting = Settings.builder()
                .id("SET00001")
                .key("test.key")
                .value("old.value")
                .description("Old description")
                .category("old")
                .build();

        Settings updatedSetting = Settings.builder()
                .id("SET00001")
                .key("test.key")
                .value("new.value")
                .description("New description")
                .category("new")
                .build();

        when(settingsRepository.findByKey("test.key")).thenReturn(Optional.of(existingSetting));
        when(settingsRepository.save(any(Settings.class))).thenReturn(updatedSetting);

        // When
        Settings result = settingsService.updateSetting("test.key", "new.value", "New description", "new");

        // Then
        assertThat(result.getValue()).isEqualTo("new.value");
        assertThat(result.getDescription()).isEqualTo("New description");
        assertThat(result.getCategory()).isEqualTo("new");
        verify(settingsRepository).save(any(Settings.class));
    }

    @Test
    public void updateSetting_WithNonExistingKey_ShouldThrowException() {
        // Given
        when(settingsRepository.findByKey("nonexistent.key")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> settingsService.updateSetting("nonexistent.key", "value", "description", "category"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Setting not found with key: nonexistent.key");

        verify(settingsRepository, never()).save(any(Settings.class));
    }

    @Test
    public void updateSetting_WithNullValues_ShouldKeepExistingValues() {
        // Given
        Settings existingSetting = Settings.builder()
                .id("SET00001")
                .key("test.key")
                .value("old.value")
                .description("Old description")
                .category("old")
                .build();

        when(settingsRepository.findByKey("test.key")).thenReturn(Optional.of(existingSetting));
        when(settingsRepository.save(any(Settings.class))).thenReturn(existingSetting);

        // When
        Settings result = settingsService.updateSetting("test.key", null, null, null);

        // Then
        assertThat(result.getValue()).isEqualTo("old.value");
        assertThat(result.getDescription()).isEqualTo("Old description");
        assertThat(result.getCategory()).isEqualTo("old");
        verify(settingsRepository).save(existingSetting);
    }

    @Test
    public void deleteSetting_WithExistingKey_ShouldDeleteSetting() {
        // Given
        Settings setting = Settings.builder()
                .id("SET00001")
                .key("test.key")
                .value("test.value")
                .build();

        when(settingsRepository.findByKey("test.key")).thenReturn(Optional.of(setting));

        // When
        settingsService.deleteSetting("test.key");

        // Then
        verify(settingsRepository).delete(setting);
    }

    @Test
    public void deleteSetting_WithNonExistingKey_ShouldThrowException() {
        // Given
        when(settingsRepository.findByKey("nonexistent.key")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> settingsService.deleteSetting("nonexistent.key"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Setting not found with key: nonexistent.key");

        verify(settingsRepository, never()).delete(any(Settings.class));
    }

    @Test
    public void upsertSetting_WithExistingKey_ShouldUpdateValue() {
        // Given
        Settings existing = Settings.builder()
                .id("SET00001")
                .key("test.key")
                .value("old.value")
                .build();

        when(settingsRepository.findByKey("test.key")).thenReturn(Optional.of(existing));
        when(settingsRepository.save(any(Settings.class))).thenAnswer(i -> i.getArgument(0));

        // When
        Settings result = settingsService.upsertSetting("test.key", "new.value");

        // Then
        assertThat(result.getValue()).isEqualTo("new.value");
        verify(settingsRepository).save(existing);
    }

    @Test
    public void upsertSetting_WithNewKey_ShouldCreateSetting() {
        // Given
        when(settingsRepository.findByKey("new.key")).thenReturn(Optional.empty());
        when(settingsRepository.save(any(Settings.class))).thenAnswer(i -> i.getArgument(0));

        // When
        Settings result = settingsService.upsertSetting("new.key", "some.value");

        // Then
        assertThat(result.getKey()).isEqualTo("new.key");
        assertThat(result.getValue()).isEqualTo("some.value");
        verify(settingsRepository).save(any(Settings.class));
    }

    @Test
    public void getIban_ShouldReturnIbanValue() {
        // Given
        Settings setting = Settings.builder()
                .id("SET00001")
                .key("bank.iban")
                .value("ES1234567890123456789012")
                .build();

        when(settingsRepository.findByKey("bank.iban")).thenReturn(Optional.of(setting));

        // When
        String result = settingsService.getIban();

        // Then
        assertThat(result).isEqualTo("ES1234567890123456789012");
    }

    @Test
    public void getIban_WhenNotSet_ShouldReturnEmptyString() {
        // Given
        when(settingsRepository.findByKey("bank.iban")).thenReturn(Optional.empty());

        // When
        String result = settingsService.getIban();

        // Then
        assertThat(result).isEmpty();
    }

    @Test
    public void setIban_WithExistingSetting_ShouldUpdateIban() {
        // Given
        Settings existingSetting = Settings.builder()
                .id("SET00001")
                .key("bank.iban")
                .value("ES1111111111111111111111")
                .build();

        when(settingsRepository.findByKey("bank.iban")).thenReturn(Optional.of(existingSetting));
        when(settingsRepository.save(any(Settings.class))).thenReturn(existingSetting);

        // When
        settingsService.setIban("ES2222222222222222222222");

        // Then
        verify(settingsRepository).save(any(Settings.class));
    }

    @Test
    public void setIban_WithoutExistingSetting_ShouldCreateIban() {
        // Given
        Settings newSetting = Settings.builder()
                .id("SET00001")
                .key("bank.iban")
                .value("ES1234567890123456789012")
                .description("IBAN de la cuenta bancaria de la asociación")
                .category("bank")
                .build();

        when(settingsRepository.findByKey("bank.iban")).thenReturn(Optional.empty());
        when(settingsRepository.save(any(Settings.class))).thenReturn(newSetting);

        // When
        settingsService.setIban("ES1234567890123456789012");

        // Then
        verify(settingsRepository).save(any(Settings.class));
    }

    @Test
    public void getEmailHost_ShouldReturnEmailHostValue() {
        // Given
        Settings setting = Settings.builder()
                .key("email.host")
                .value("smtp.example.com")
                .build();

        when(settingsRepository.findByKey("email.host")).thenReturn(Optional.of(setting));

        // When
        String result = settingsService.getEmailHost();

        // Then
        assertThat(result).isEqualTo("smtp.example.com");
    }

    @Test
    public void setEmailHost_WithExistingSetting_ShouldUpdateEmailHost() {
        // Given
        Settings existingSetting = Settings.builder()
                .key("email.host")
                .value("smtp.old.com")
                .build();

        when(settingsRepository.findByKey("email.host")).thenReturn(Optional.of(existingSetting));
        when(settingsRepository.save(any(Settings.class))).thenReturn(existingSetting);

        // When
        settingsService.setEmailHost("smtp.new.com");

        // Then
        verify(settingsRepository).save(any(Settings.class));
    }

    @Test
    public void getEmailPort_WhenNotSet_ShouldReturnDefaultValue() {
        // Given
        when(settingsRepository.findByKey("email.port")).thenReturn(Optional.empty());

        // When
        String result = settingsService.getEmailPort();

        // Then
        assertThat(result).isEqualTo("587");
    }

    @Test
    public void setEmailPort_WithoutExistingSetting_ShouldCreateEmailPort() {
        // Given
        Settings newSetting = Settings.builder()
                .key("email.port")
                .value("465")
                .build();

        when(settingsRepository.findByKey("email.port")).thenReturn(Optional.empty());
        when(settingsRepository.save(any(Settings.class))).thenReturn(newSetting);

        // When
        settingsService.setEmailPort("465");

        // Then
        verify(settingsRepository).save(any(Settings.class));
    }

    @Test
    public void getEmailSmtpAuth_ShouldReturnBooleanValue() {
        // Given
        Settings setting = Settings.builder()
                .key("email.smtp.auth")
                .value("true")
                .build();

        when(settingsRepository.findByKey("email.smtp.auth")).thenReturn(Optional.of(setting));

        // When
        boolean result = settingsService.getEmailSmtpAuth();

        // Then
        assertThat(result).isTrue();
    }

    @Test
    public void getEmailSmtpAuth_WhenNotSet_ShouldReturnDefaultTrue() {
        // Given
        when(settingsRepository.findByKey("email.smtp.auth")).thenReturn(Optional.empty());

        // When
        boolean result = settingsService.getEmailSmtpAuth();

        // Then
        assertThat(result).isTrue();
    }

    @Test
    public void setEmailSmtpAuth_ShouldSetBooleanValue() {
        // Given
        Settings setting = Settings.builder()
                .key("email.smtp.auth")
                .value("false")
                .build();

        when(settingsRepository.findByKey("email.smtp.auth")).thenReturn(Optional.of(setting));
        when(settingsRepository.save(any(Settings.class))).thenReturn(setting);

        // When
        settingsService.setEmailSmtpAuth(false);

        // Then
        verify(settingsRepository).save(any(Settings.class));
    }

    @Test
    public void getEmailSmtpConnectionTimeout_ShouldReturnIntegerValue() {
        // Given
        Settings setting = Settings.builder()
                .key("email.smtp.connectiontimeout")
                .value("10000")
                .build();

        when(settingsRepository.findByKey("email.smtp.connectiontimeout")).thenReturn(Optional.of(setting));

        // When
        int result = settingsService.getEmailSmtpConnectionTimeout();

        // Then
        assertThat(result).isEqualTo(10000);
    }

    @Test
    public void getEmailSmtpConnectionTimeout_WhenNotSet_ShouldReturnDefault() {
        // Given
        when(settingsRepository.findByKey("email.smtp.connectiontimeout")).thenReturn(Optional.empty());

        // When
        int result = settingsService.getEmailSmtpConnectionTimeout();

        // Then
        assertThat(result).isEqualTo(5000);
    }

    @Test
    public void setEmailSmtpConnectionTimeout_ShouldSetIntegerValue() {
        // Given
        Settings setting = Settings.builder()
                .key("email.smtp.connectiontimeout")
                .value("8000")
                .build();

        when(settingsRepository.findByKey("email.smtp.connectiontimeout")).thenReturn(Optional.of(setting));
        when(settingsRepository.save(any(Settings.class))).thenReturn(setting);

        // When
        settingsService.setEmailSmtpConnectionTimeout(8000);

        // Then
        verify(settingsRepository).save(any(Settings.class));
    }

    @Test
    public void getEmailFrom_ShouldReturnFromAddress() {
        // Given
        Settings setting = Settings.builder()
                .key("email.from")
                .value("noreply@example.com")
                .build();

        when(settingsRepository.findByKey("email.from")).thenReturn(Optional.of(setting));

        // When
        String result = settingsService.getEmailFrom();

        // Then
        assertThat(result).isEqualTo("noreply@example.com");
    }

    @Test
    public void getEmailFromName_WhenNotSet_ShouldReturnDefaultYambo() {
        // Given
        when(settingsRepository.findByKey("email.from.name")).thenReturn(Optional.empty());

        // When
        String result = settingsService.getEmailFromName();

        // Then
        assertThat(result).isEqualTo("Yambo");
    }

    @Test
    public void setEmailFromName_ShouldSetFromName() {
        // Given
        Settings setting = Settings.builder()
                .key("email.from.name")
                .value("Yambo Association")
                .build();

        when(settingsRepository.findByKey("email.from.name")).thenReturn(Optional.of(setting));
        when(settingsRepository.save(any(Settings.class))).thenReturn(setting);

        // When
        settingsService.setEmailFromName("Yambo Association");

        // Then
        verify(settingsRepository).save(any(Settings.class));
    }

    @Test
    public void getDomain_ShouldReturnDomainValue() {
        // Given
        Settings setting = Settings.builder()
                .key("app.domain")
                .value("https://yambo-alco.es")
                .build();

        when(settingsRepository.findByKey("app.domain")).thenReturn(Optional.of(setting));

        // When
        String result = settingsService.getDomain();

        // Then
        assertThat(result).isEqualTo("https://yambo-alco.es");
    }

    @Test
    public void getDomain_WhenNotSet_ShouldReturnDefaultValue() {
        // Given
        when(settingsRepository.findByKey("app.domain")).thenReturn(Optional.empty());

        // When
        String result = settingsService.getDomain();

        // Then
        assertThat(result).isEqualTo("http://localhost");
    }

    @Test
    public void setDomain_WithExistingSetting_ShouldUpdateDomain() {
        // Given
        Settings existingSetting = Settings.builder()
                .key("app.domain")
                .value("http://localhost:3000")
                .build();

        when(settingsRepository.findByKey("app.domain")).thenReturn(Optional.of(existingSetting));
        when(settingsRepository.save(any(Settings.class))).thenReturn(existingSetting);

        // When
        settingsService.setDomain("https://yambo-alco.es");

        // Then
        verify(settingsRepository).save(any(Settings.class));
    }

    @Test
    public void setDomain_WithoutExistingSetting_ShouldCreateDomain() {
        // Given
        Settings newSetting = Settings.builder()
                .key("app.domain")
                .value("https://yambo-alco.es")
                .description("Dominio de la aplicación para enlaces en correos")
                .category("app")
                .build();

        when(settingsRepository.findByKey("app.domain")).thenReturn(Optional.empty());
        when(settingsRepository.save(any(Settings.class))).thenReturn(newSetting);

        // When
        settingsService.setDomain("https://yambo-alco.es");

        // Then
        verify(settingsRepository).save(any(Settings.class));
    }

    @Test
    public void getIssueCreationWindowDays_WhenSettingExists_ShouldReturnParsedValue() {
        // Given
        Settings setting = Settings.builder()
                .key("issues.creation_window_days")
                .value("45")
                .build();

        when(settingsRepository.findByKey("issues.creation_window_days")).thenReturn(Optional.of(setting));

        // When
        int result = settingsService.getIssueCreationWindowDays();

        // Then
        assertThat(result).isEqualTo(45);
    }

    @Test
    public void getIssueCreationWindowDays_WhenSettingMissing_ShouldReturnDefault() {
        // Given
        when(settingsRepository.findByKey("issues.creation_window_days")).thenReturn(Optional.empty());

        // When
        int result = settingsService.getIssueCreationWindowDays();

        // Then
        assertThat(result).isEqualTo(30);
    }

    @Test
    public void getIssueCreationWindowDays_WhenSettingInvalidOrNegative_ShouldReturnDefault() {
        // Given
        Settings invalid = Settings.builder().key("issues.creation_window_days").value("abc").build();
        Settings negative = Settings.builder().key("issues.creation_window_days").value("-2").build();

        when(settingsRepository.findByKey("issues.creation_window_days"))
                .thenReturn(Optional.of(invalid))
                .thenReturn(Optional.of(negative));

        // When
        int invalidResult = settingsService.getIssueCreationWindowDays();
        int negativeResult = settingsService.getIssueCreationWindowDays();

        // Then
        assertThat(invalidResult).isEqualTo(30);
        assertThat(negativeResult).isEqualTo(30);
    }

    @Test
    public void setIssueCreationWindowDays_WithNegativeValue_ShouldThrowBadRequest() {
        assertThatThrownBy(() -> settingsService.setIssueCreationWindowDays(-1))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Issue creation window days must be 0 or greater");

        verify(settingsRepository, never()).save(any(Settings.class));
    }

    // ── Upload Settings Tests ──

    @Test
    public void getUploadMaxFileSizeMb_WhenSettingExists_ShouldReturnParsedValue() {
        // Given
        Settings setting = Settings.builder()
                .key("upload.max_file_size_mb")
                .value("10")
                .build();

        when(settingsRepository.findByKey("upload.max_file_size_mb")).thenReturn(Optional.of(setting));

        // When
        int result = settingsService.getUploadMaxFileSizeMb();

        // Then
        assertThat(result).isEqualTo(10);
    }

    @Test
    public void getUploadMaxFileSizeMb_WhenSettingMissing_ShouldReturnDefault() {
        // Given
        when(settingsRepository.findByKey("upload.max_file_size_mb")).thenReturn(Optional.empty());

        // When
        int result = settingsService.getUploadMaxFileSizeMb();

        // Then
        assertThat(result).isEqualTo(5);
    }

    @Test
    public void getUploadMaxFileSizeMb_WhenSettingInvalid_ShouldReturnDefault() {
        // Given
        Settings setting = Settings.builder()
                .key("upload.max_file_size_mb")
                .value("abc")
                .build();

        when(settingsRepository.findByKey("upload.max_file_size_mb")).thenReturn(Optional.of(setting));

        // When
        int result = settingsService.getUploadMaxFileSizeMb();

        // Then
        assertThat(result).isEqualTo(5);
    }

    @Test
    public void getUploadMaxFileSizeMb_WhenSettingNegative_ShouldReturnDefault() {
        // Given
        Settings setting = Settings.builder()
                .key("upload.max_file_size_mb")
                .value("-3")
                .build();

        when(settingsRepository.findByKey("upload.max_file_size_mb")).thenReturn(Optional.of(setting));

        // When
        int result = settingsService.getUploadMaxFileSizeMb();

        // Then
        assertThat(result).isEqualTo(5);
    }

    @Test
    public void setUploadMaxFileSizeMb_WithValidValue_ShouldUpdateSetting() {
        // Given
        Settings existing = Settings.builder()
                .key("upload.max_file_size_mb")
                .value("5")
                .build();

        when(settingsRepository.findByKey("upload.max_file_size_mb")).thenReturn(Optional.of(existing));
        when(settingsRepository.save(any(Settings.class))).thenReturn(existing);

        // When
        settingsService.setUploadMaxFileSizeMb(10);

        // Then
        verify(settingsRepository).save(any(Settings.class));
    }

    @Test
    public void setUploadMaxFileSizeMb_WithNegativeValue_ShouldThrowBadRequest() {
        assertThatThrownBy(() -> settingsService.setUploadMaxFileSizeMb(-1))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Max file size must be greater than 0");

        verify(settingsRepository, never()).save(any(Settings.class));
    }

    @Test
    public void setUploadMaxFileSizeMb_WithZeroValue_ShouldThrowBadRequest() {
        assertThatThrownBy(() -> settingsService.setUploadMaxFileSizeMb(0))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Max file size must be greater than 0");

        verify(settingsRepository, never()).save(any(Settings.class));
    }
}
