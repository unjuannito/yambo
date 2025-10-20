package es.yambo_alco.web.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnMissingBean(name = "javaMailSender")
public class ConsoleMailService implements MailService {

    private static final Logger log = LoggerFactory.getLogger(ConsoleMailService.class);

    @PostConstruct
    public void init() {
        log.warn("==============================================================");
        log.warn("  MAIL SERVICE: Console Mode (Development)");
        log.warn("  Emails will be logged to console instead of being sent.");
        log.warn("  Configure SMTP settings to enable real email sending.");
        log.warn("  See MAIL_CONFIGURATION.md for setup instructions.");
        log.warn("==============================================================");
    }

    @Override
    public void sendInvitation(String to, String subject, String body) {
        log.info("╔════════════════════════════════════════════════════════════╗");
        log.info("║              INVITATION EMAIL (CONSOLE MODE)               ║");
        log.info("╠════════════════════════════════════════════════════════════╣");
        log.info("║ To:      {}", to);
        log.info("║ Subject: {}", subject);
        log.info("╠════════════════════════════════════════════════════════════╣");
        log.info("║ Body:");
        body.lines().forEach(line -> log.info("║   {}", line));
        log.info("╚════════════════════════════════════════════════════════════╝");
    }
}
