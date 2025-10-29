package es.yambo_alco.web.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnBean(JavaMailSender.class)
@RequiredArgsConstructor
public class SmtpMailService implements MailService {

    private static final Logger log = LoggerFactory.getLogger(SmtpMailService.class);
    
    private final JavaMailSender mailSender;

    @Override
    public void sendInvitation(String to, String subject, String body) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, false); // false = plain text, true = HTML
            
            mailSender.send(message);
            log.info("Invitation email sent successfully to: {}", to);
        } catch (MessagingException e) {
            log.error("Failed to send invitation email to: {}", to, e);
            throw new RuntimeException("Failed to send invitation email", e);
        }
    }
}
