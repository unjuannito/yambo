package es.yambo_alco.web.config;

import es.yambo_alco.web.service.SettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

@Configuration
@RequiredArgsConstructor
public class MailConfig {

    private final SettingsService settingsService;

    @Bean
    public JavaMailSender javaMailSender() {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();

        // Read configuration from database
        String host = settingsService.getEmailHost();
        String portStr = settingsService.getEmailPort();
        String username = settingsService.getEmailUsername();
        String password = settingsService.getEmailPassword();

        // Only configure if host is set
        if (host != null && !host.isEmpty()) {
            mailSender.setHost(host);

            try {
                int port = Integer.parseInt(portStr);
                mailSender.setPort(port);
            } catch (NumberFormatException e) {
                mailSender.setPort(587); // Default SMTP port
            }

            if (username != null && !username.isEmpty()) {
                mailSender.setUsername(username);
            }

            if (password != null && !password.isEmpty()) {
                mailSender.setPassword(password);
            }

            // Get additional SMTP properties from database
            boolean auth = settingsService.getEmailSmtpAuth();
            boolean starttlsEnable = settingsService.getEmailSmtpStartTlsEnable();
            boolean starttlsRequired = settingsService.getEmailSmtpStartTlsRequired();
            int connectionTimeout = settingsService.getEmailSmtpConnectionTimeout();
            int timeout = settingsService.getEmailSmtpTimeout();
            int writeTimeout = settingsService.getEmailSmtpWriteTimeout();

            Properties props = mailSender.getJavaMailProperties();
            props.put("mail.transport.protocol", "smtp");
            props.put("mail.smtp.auth", auth);
            props.put("mail.smtp.starttls.enable", starttlsEnable);
            props.put("mail.smtp.starttls.required", starttlsRequired);
            props.put("mail.smtp.connectiontimeout", connectionTimeout);
            props.put("mail.smtp.timeout", timeout);
            props.put("mail.smtp.writetimeout", writeTimeout);
            props.put("mail.debug", "false"); // Set to true for debugging
        }

        return mailSender;
    }
}
