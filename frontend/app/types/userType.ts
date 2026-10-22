import type { PhotoEdit } from "~/utils/photoCrop";
import type { ElephantAvatarConfig } from "~/components/ElephantAvatar";

export type NotificationPreferences = {
    orderStatus: boolean;
    orderCancelled: boolean;
    issueCreated: boolean;
    issueComments: boolean;
    issueStatus: boolean;
};

/**
 * Datos propios de un miembro del equipo (extensión 1:1 del usuario).
 * Solo viene informado mientras el usuario es staff: añadido a mano (`manual`)
 * o con un rol de monitor/coordinador en algún grupo.
 */
export type StaffData = {
    /** La foto ya encuadrada, la que se muestra. */
    photo?: string | null;
    /** La foto tal como se subió, para poder volver a encuadrarla. */
    photoOriginal?: string | null;
    photoEdit?: PhotoEdit | null;
    bio?: string | null;
    funFact?: string | null;
    nickname?: string | null;
    /** Enlace a su post de #comosenotaqueeresdeyambo. */
    instagramUrl?: string | null;
    /** Su elefante personalizado; sin él se dibuja el que le toca por defecto. */
    avatar?: ElephantAvatarConfig | null;
    /** Opt-in: solo aparece en la web pública si está activado. */
    photoConsent: boolean;
    /** Fecha en la que activó la visibilidad pública (su consentimiento). */
    photoConsentAt?: string | null;
    manual: boolean;
};

export type CurrentUser = {
    id: string;
    email: string;
    name: string;
    staff?: StaffData | null;
    notificationPreferences?: NotificationPreferences;
    groupRoles?: UserGroupRole[];
    permissions: Permission[]
};

export type User = {
    id: string;
    /** Vacío solo en personas dadas de alta sin cuenta de las que aún no se sabe el correo. */
    email: string | null;
    /** false = persona del equipo dada de alta por un admin que todavía no puede iniciar sesión. */
    hasAccount?: boolean;
    name: string;
    staff?: StaffData | null;
    groupRoles?: UserGroupRole[];
    createdAt: string;
    created_by: string;
    permissions: Permission[]
    profiles : Profile[]
    enabled: boolean;
    system?: boolean;
}

import type { GroupRole } from './role';

export type UserGroupRole = {
    groupId: string;
    groupName: string | null;
    projectId: string;
    projectName: string;
    role: GroupRole;
}

export type Profile = {
    id: string;
    name: string;
}

export type Permission = {
    obj: string
    actions: string[]
}

