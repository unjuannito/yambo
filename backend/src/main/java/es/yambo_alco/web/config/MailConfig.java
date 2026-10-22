package es.yambo_alco.web.config;

import es.yambo_alco.web.service.SettingsService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Component;

import java.util.Properties;

/**
 * Manages a mutable {@link JavaMailSender} that can be refreshed at runtime
 * when SMTP settings are changed through the admin panel — no server restart required.
 */
@Component
@RequiredArgsConstructor
public class MailConfig {

    private static final Logger log = LoggerFactory.getLogger(MailConfig.class);

    private final SettingsService settingsService;
    private volatile JavaMailSenderImpl mailSender;

    @PostConstruct
    public void init() {
        refresh();
    }

    /**
     * Rebuilds the {@link JavaMailSender} from the current settings.
     * Called at startup and whenever email settings are updated via the API.
     */
    public void refresh() {
        String host = settingsService.getEmailHost();
        if (host == null || host.isBlank()) {
            mailSender = null;
            log.warn("SMTP host not configured — emails will be logged to console instead of being sent.");
            return;
        }

        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(host);

        try {
            sender.setPort(Integer.parseInt(settingsService.getEmailPort()));
        } catch (NumberFormatException e) {
            sender.setPort(587);
        }

        String username = settingsService.getEmailUsername();
        if (username != null && !username.isEmpty()) {
            sender.setUsername(username);
        }

        String password = settingsService.getEmailPassword();
        if (password != null && !password.isEmpty()) {
            sender.setPassword(password);
        }

        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", settingsService.getEmailSmtpAuth());
        props.put("mail.smtp.starttls.enable", settingsService.getEmailSmtpStartTlsEnable());
        props.put("mail.smtp.starttls.required", settingsService.getEmailSmtpStartTlsRequired());
        props.put("mail.smtp.connectiontimeout", settingsService.getEmailSmtpConnectionTimeout());
        props.put("mail.smtp.timeout", settingsService.getEmailSmtpTimeout());
        props.put("mail.smtp.writetimeout", settingsService.getEmailSmtpWriteTimeout());
        props.put("mail.debug", "false");

        this.mailSender = sender;
        log.info("Mail sender configured: host={}, port={}", sender.getHost(), sender.getPort());
    }

    /**
     * Returns the current mail sender, or {@code null} if SMTP is not configured.
     */
    public JavaMailSender getMailSender() {
        return mailSender;
    }

    /**
     * Whether SMTP is configured and ready to send emails.
     */
    public boolean isConfigured() {
        return mailSender != null;
    }
}
