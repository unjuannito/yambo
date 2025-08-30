package es.yambo_alco.web.service;

public interface MailService {
    void sendInvitation(String to, String subject, String body);
}
