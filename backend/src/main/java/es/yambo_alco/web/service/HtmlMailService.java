package es.yambo_alco.web.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.context.annotation.Primary;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

@Service
@Primary
@ConditionalOnBean(JavaMailSender.class)
@RequiredArgsConstructor
public class HtmlMailService implements MailService {

    private static final Logger log = LoggerFactory.getLogger(HtmlMailService.class);
    
    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;
    private final SettingsService settingsService;

    @Value("${invitation.expiration.hours:72}")
    private long expirationHours;

    @Override
    public void sendInvitation(String to, String subject, String body) {
        try {
            // Get from email and name from database settings
            String fromEmail = settingsService.getEmailFrom();
            String fromName = settingsService.getEmailFromName();
            
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(fromEmail, fromName);
            helper.setTo(to);
            helper.setSubject(subject);
            
            // Extract invitation link from body (assumes body contains the link)
            String invitationLink = extractInvitationLink(body);
            
            // Create context with variables for the template
            Context context = new Context();
            context.setVariable("invitationLink", invitationLink);
            context.setVariable("expirationHours", expirationHours);
            
            // Process the template
            String htmlContent = templateEngine.process("emails/invitation", context);
            
            // Set both plain text and HTML content
            helper.setText(body, htmlContent);
            
            mailSender.send(message);
            log.info("Invitation email sent successfully to: {}", to);
        } catch (MessagingException e) {
            log.error("Failed to send invitation email to: {}", to, e);
            throw new RuntimeException("Failed to send invitation email", e);
        } catch (Exception e) {
            log.error("Unexpected error sending email to: {}", to, e);
            throw new RuntimeException("Failed to send invitation email", e);
        }
    }

    /**
     * Extract the invitation link from the plain text body.
     * Looks for a URL starting with http:// or https://
     */
    private String extractInvitationLink(String body) {
        if (body == null) {
            return "";
        }
        
        // Simple extraction: find http:// or https:// followed by non-whitespace characters
        String[] words = body.split("\\s+");
        for (String word : words) {
            if (word.startsWith("http://") || word.startsWith("https://")) {
                return word;
            }
        }
        
        return "";
    }
}
