package es.yambo_alco.web.model.enums;

/** Tipo de invitación que originó la concesión (solo cuando GrantSource = INVITATION). */
public enum InvitationType {
    /** Enlace genérico de registro con perfiles (tabla invitations). */
    LINK,
    /** Invitación nominativa por email (tabla nominative_invitations). */
    NOMINATIVE,
    /** Enlace por proyecto+rol (tabla project_role_invitation, antes parent_invitation). */
    PROJECT_ROLE
}
