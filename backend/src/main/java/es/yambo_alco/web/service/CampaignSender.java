package es.yambo_alco.web.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Envía un comunicado a todos sus destinatarios (issue #123).
 * <p>
 * Un comunicado entero es <b>una única tarea asíncrona</b> sobre
 * {@code mailExecutor} que entrega los correos en secuencia. Así, aunque el
 * pool de correo sea pequeño (core 2 / max 10 / cola 50), una campaña a cientos
 * de socios no desborda la cola — a diferencia de lanzar una tarea asíncrona por
 * destinatario.
 * <p>
 * Vive en un componente aparte (y no dentro de {@link CampaignService}) para que
 * la invocación cruce el proxy de Spring y el {@code @Async} se active de verdad
 * (la auto-invocación no la activaría).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CampaignSender {

    private final MailService mailService;

    @Async("mailExecutor")
    public void sendAll(String subject, String htmlDocument, List<CampaignRecipient> recipients) {
        int sent = 0;
        for (CampaignRecipient r : recipients) {
            try {
                mailService.sendRaw(r.email(), subject, htmlDocument);
                sent++;
            } catch (Exception e) {
                log.error("Failed to deliver campaign [{}] to {} ({}): {}",
                        subject, r.name(), r.email(), e.getMessage());
            }
        }
        log.info("Campaign [{}] delivered to {}/{} recipients", subject, sent, recipients.size());
    }
}
