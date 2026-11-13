package es.yambo_alco.web.service;

import es.yambo_alco.web.util.CampaignVariables;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import es.yambo_alco.web.config.MailConfig;
import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.model.EmailCampaign;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.CampaignAudience;
import es.yambo_alco.web.repository.EmailCampaignRepository;
import es.yambo_alco.web.repository.ProjectGroupRepository;
import es.yambo_alco.web.repository.UserRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Comunicados / broadcast (issue #123).
 * <p>
 * Un comunicado es un correo (asunto + cuerpo markdown) dirigido a una audiencia:
 * todos los socios, un perfil, un proyecto, un grupo o una lista explícita de
 * socios. Al enviar se resuelve la audiencia a destinatarios concretos —
 * filtrando a los que se han dado de baja de los comunicados
 * ({@code NotificationPreferences.receiveCampaigns}) — y se envía el mensaje a
 * cada uno de forma asíncrona (una sola tarea, entregas en secuencia).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CampaignService {

    private final EmailCampaignRepository campaignRepository;
    private final UserRepository userRepository;
    private final ProjectGroupRepository projectGroupRepository;
    private final EmailRenderer emailRenderer;
    private final CampaignSender campaignSender;
    private final MailConfig mailConfig;
    private final ObjectMapper objectMapper;

    /** Vista de un comunicado para el admin. */
    @Data
    public static class CampaignView {
        private String id;
        private String subject;
        private String body;
        private CampaignAudience audienceType;
        private String audienceRef;
        private List<String> audienceUsers;
        private int recipientCount;
        private String status;
        private String sentBy;
        private LocalDateTime createdAt;
        private LocalDateTime sentAt;

        /** Full view (includes the body) — for the editor. */
        public static CampaignView from(EmailCampaign c) {
            CampaignView v = new CampaignView();
            v.setId(c.getId());
            v.setSubject(c.getSubject());
            v.setBody(c.getBody());
            v.setAudienceType(c.getAudienceType());
            v.setAudienceRef(c.getAudienceRef());
            v.setAudienceUsers(c.audienceUsers());
            v.setRecipientCount(c.getRecipientCount());
            v.setStatus(c.getStatus());
            v.setSentBy(c.getSentBy());
            v.setCreatedAt(c.getCreatedAt());
            v.setSentAt(c.getSentAt());
            return v;
        }

        /** List view — omits the body to keep the list payload light. */
        public static CampaignView fromSummary(EmailCampaign c) {
            CampaignView v = from(c);
            v.setBody(null);
            return v;
        }
    }

    /**
     * Crea un borrador de comunicado.
     *
     * @param subject     asunto
     * @param body        cuerpo markdown
     * @param audienceType audiencia (ALL/PROFILE/PROJECT/GROUP/USERS)
     * @param audienceRef  id del perfil/proyecto/grupo (según la audiencia)
     * @param audienceUsers ids explícitos (solo USERS)
     */
    @Transactional
    public CampaignView create(String subject, String body, CampaignAudience audienceType,
                               String audienceRef, List<String> audienceUsers, String sentBy) {
        validateAudience(audienceType, audienceRef, audienceUsers);
        if (subject == null || subject.trim().isBlank()) {
            throw new BadRequestException("El asunto es obligatorio");
        }
        if (body == null || body.trim().isBlank()) {
            throw new BadRequestException("El cuerpo es obligatorio");
        }

        EmailCampaign campaign = EmailCampaign.builder()
                .subject(subject.trim())
                .body(body)
                .audienceType(audienceType)
                .audienceRef(audienceRef)
                .audienceUsersJson(writeUsers(audienceUsers))
                .status("DRAFT")
                .sentBy(sentBy)
                .build();
        return CampaignView.from(campaignRepository.save(campaign));
    }

    @Transactional(readOnly = true)
    public List<CampaignView> list() {
        return campaignRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(CampaignView::fromSummary).toList();
    }

    @Transactional(readOnly = true)
    public CampaignView get(String id) {
        return CampaignView.from(require(id));
    }

    /**
     * Edita un borrador (asunto, cuerpo o audiencia). Un comunicado ya enviado no
     * puede modificarse.
     */
    @Transactional
    public CampaignView update(String id, String subject, String body, CampaignAudience audienceType,
                               String audienceRef, List<String> audienceUsers, String sentBy) {
        EmailCampaign c = require(id);
        if ("SENT".equals(c.getStatus())) {
            throw new BadRequestException("No se puede editar un comunicado ya enviado");
        }
        if (subject != null) {
            if (subject.trim().isBlank()) {
                throw new BadRequestException("El asunto es obligatorio");
            }
            c.setSubject(subject.trim());
        }
        if (body != null && !body.trim().isBlank()) {
            c.setBody(body);
        }
        // La audiencia solo se valida/actualiza si se envía (permite actualizar
        // solo asunto o cuerpo).
        if (audienceType != null) {
            validateAudience(audienceType, audienceRef, audienceUsers);
            c.setAudienceType(audienceType);
            c.setAudienceRef(audienceRef);
            c.setAudienceUsersJson(writeUsers(audienceUsers));
        }
        c.setSentBy(sentBy);
        return CampaignView.from(campaignRepository.save(c));
    }

    /**
     * Resumen de destinatarios (para el diálogo de confirmación antes de enviar):
     * cuántos y quiénes recibirán el comunicado una vez aplicado el opt-out.
     */
    @Transactional(readOnly = true)
    public RecipientSummary previewRecipients(String id) {
        EmailCampaign c = require(id);
        List<CampaignRecipient> recipients = resolveRecipients(c);
        return new RecipientSummary(recipients.size(),
                recipients.stream().map(CampaignRecipient::name).toList(),
                recipients.stream().map(CampaignRecipient::email).toList());
    }

    /**
     * Vista previa del cuerpo del comunicado renderizado (markdown → HTML de
     * marca), para el iframe de previsualización del admin.
     *
     * @return documento HTML completo
     */
    @Transactional(readOnly = true)
    public String previewHtml(String id) {
        EmailCampaign c = require(id);
        return emailRenderer.renderCampaignBody(c.getBody() == null ? "" : c.getBody());
    }

    public List<CampaignVariables.Variable> variables() {
        return CampaignVariables.catalog(emailRenderer.campaignVariables(
                CampaignVariables.SAMPLE, CampaignVariables.now()));
    }

    /** Respuesta de la vista previa del cuerpo de un comunicado. */
    @Data
    @lombok.AllArgsConstructor
    public static class CampaignPreviewResponse {
        private String html;
    }

    /**
     * Envía el comunicado a su audiencia. Marca el borrador como enviado y lanza
     * el envío asíncrono (una única tarea, entregas en secuencia).
     *
     * @return resumen de cuántos destinatarios se van a notificar
     */
    @Transactional
    public RecipientSummary send(String id, String sentBy) {
        EmailCampaign c = require(id);
        if ("SENT".equals(c.getStatus())) {
            throw new BadRequestException("Este comunicado ya se ha enviado");
        }
        List<CampaignRecipient> recipients = resolveRecipients(c);
        if (recipients.isEmpty()) {
            throw new BadRequestException("No hay destinatarios que reciban el comunicado "
                    + "(audience vacía o todos los socios se han dado de baja)");
        }

        c.setRecipientCount(recipients.size());
        c.setStatus("SENT");
        c.setSentBy(sentBy);
        c.setSentAt(LocalDateTime.now());
        campaignRepository.save(c);

        boolean configured = mailConfig.isConfigured();
        if (configured) {
            campaignSender.sendAll(c.getSubject(), c.getBody(), recipients);
        } else {
            log.info("[CONSOLE MODE] Campaign [{}] for {} recipients (SMTP no configured): {}",
                    c.getSubject(), recipients.size(), c.getSubject());
        }
        log.info("Campaign {} queued for {} recipients by {}", id, recipients.size(), sentBy);
        return new RecipientSummary(recipients.size(),
                recipients.stream().map(CampaignRecipient::name).toList(),
                recipients.stream().map(CampaignRecipient::email).toList());
    }

    @Transactional
    public void delete(String id) {
        EmailCampaign c = require(id);
        if ("SENT".equals(c.getStatus())) {
            throw new BadRequestException("No se puede borrar un comunicado ya enviado");
        }
        campaignRepository.delete(c);
    }

    // ── helpers ───────────────────────────────────────────────────────────

    private EmailCampaign require(String id) {
        return campaignRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("Comunicado no encontrado: " + id));
    }

    private void validateAudience(CampaignAudience type, String ref, List<String> users) {
        if (type == null) {
            throw new BadRequestException("La audiencia es obligatoria");
        }
        switch (type) {
            case ALL -> { /* no necesita ref */ }
            case PROFILE, PROJECT, GROUP -> {
                if (ref == null || ref.isBlank()) {
                    throw new BadRequestException("La audiencia " + type + " necesita un id de "
                            + (type == CampaignAudience.PROFILE ? "perfil"
                            : type == CampaignAudience.PROJECT ? "proyecto" : "grupo"));
                }
            }
            case USERS -> {
                if (users == null || users.isEmpty()) {
                    throw new BadRequestException("La audiencia de socios necesita al menos un socio");
                }
            }
        }
    }

    /**
     * Resuelve la audiencia a destinatarios concretos, aplicando el opt-out
     * (solo socios activos, con cuenta y con email, que no se han dado de baja).
     */
    List<CampaignRecipient> resolveRecipients(EmailCampaign c) {
        Set<User> users = new LinkedHashSet<>();
        switch (c.getAudienceType()) {
            case ALL -> users.addAll(userRepository.findEnabledWithEmail());
            case PROFILE -> users.addAll(userRepository.findProfileMembersWithEmail(c.getAudienceRef()));
            case GROUP -> users.addAll(userRepository.findGroupMembersWithEmail(c.getAudienceRef()));
            case PROJECT -> {
                List<String> groupIds = projectGroupRepository.findByProjectId(c.getAudienceRef())
                        .stream().map(pg -> pg.getId()).toList();
                for (String groupId : groupIds) {
                    users.addAll(userRepository.findGroupMembersWithEmail(groupId));
                }
            }
            case USERS -> {
                List<String> ids = new ArrayList<>(new LinkedHashSet<>(c.audienceUsers()));
                if (!ids.isEmpty()) {
                    users.addAll(userRepository.findByIdIn(ids));
                }
            }
        }

        List<CampaignRecipient> recipients = new ArrayList<>();
        for (User u : users) {
            if (u.getEmail() == null || u.getEmail().isBlank()) {
                continue;
            }
            if (!isReceivingCampaigns(u)) {
                continue;
            }
            recipients.add(new CampaignRecipient(u.getId(), u.getName(), u.getEmail()));
        }
        return recipients;
    }

    /**
     * ¿Recibe el socio comunicados? Default: sí (opt-in). Solo se filtra a quien
     * se ha dado de baja explícitamente.
     */
    private boolean isReceivingCampaigns(User u) {
        var prefs = u.getNotificationPreferences();
        return prefs == null || prefs.isReceiveCampaigns();
    }

    private String writeUsers(List<String> users) {
        if (users == null || users.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(users);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }

    // ── DTOs ──────────────────────────────────────────────────────────────

    /** Resumen de destinatarios para el diálogo de confirmación. */
    @Data
    @lombok.AllArgsConstructor
    public static class RecipientSummary {
        private int count;
        private List<String> names;
        private List<String> emails;
    }
}
