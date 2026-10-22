/**
 * Qué cuenta la tarjeta de compartir (og:image) de cada página y dónde se sirve.
 * El dibujo está en `shareCard.server.tsx`; aquí solo los datos, para poder probarlos.
 */

import type { Activity } from "~/types/activity";
import type { GroupRole } from "~/types/role";
import { withMadridOffset } from "./jsonld";
import { isIndexableActivity } from "./seo";

const TIME_ZONE = "Europe/Madrid";

export interface ShareCard {
    /** Línea pequeña sobre el título: el proyecto, «Invitación»… */
    eyebrow?: string | null;
    title: string;
    /** Datos sueltos (fecha, lugar, precio) que se muestran separados por puntos. */
    details?: (string | null | undefined | false)[];
    /** Etiqueta destacada en la esquina, p. ej. «Inscripciones abiertas». */
    badge?: { label: string; tone: "positive" | "negative" | "neutral" } | null;
    /** Foto subida (`/uploads/...`). Sin ella, o si no se puede usar, la tarjeta va en color. */
    image?: string | null;
    /** Color del proyecto; por defecto el verde de la marca. */
    accent?: string | null;
    /** Fotos de personas (`/uploads/...`) que se muestran en círculos, p. ej. el equipo. */
    people?: string[];
}

/** Rutas de las tarjetas. Llevan la versión para que un cambio no se quede en la caché de las redes. */
export const shareImagePaths = {
    activity: (activity: { id: string }, version: string) => `/og/actividades/${activity.id}?v=${version}`,
    project: (project: { id: string }, version: string) => `/og/proyectos/${project.id}?v=${version}`,
    projectInvitation: (token: string) => `/og/invitacion/${encodeURIComponent(token)}`,
    invitation: () => "/og/invitacion",
    /** Páginas fijas; la versión sale de la propia tarjeta (`cardVersion(card)`). */
    page: (page: SharePage, card: ShareCard) => `/og/${page}?v=${cardVersion(card)}`,
    legal: (page: { id: string }, card: ShareCard) => `/og/legal/${encodeURIComponent(page.id)}?v=${cardVersion(card)}`,
};

/**
 * Huella corta de lo que sale en la tarjeta: cambia cuando cambia el contenido, así
 * WhatsApp y compañía piden la imagen nueva en vez de enseñar la que guardaron.
 */
export function cardVersion(...parts: unknown[]): string {
    const text = JSON.stringify(parts);
    let hash = 5381;
    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
    }
    return (hash >>> 0).toString(36);
}

function formatDay(date: Date, withWeekday: boolean): string {
    return date.toLocaleDateString("es-ES", {
        timeZone: TIME_ZONE,
        weekday: withWeekday ? "short" : undefined,
        day: "numeric",
        month: "short",
    });
}

/** Las fechas llegan como hora de Madrid sin zona: se leen así aunque el servidor esté en UTC. */
function madridDate(value: string): Date {
    const date = new Date(withMadridOffset(value));
    // Años absurdos (p. ej. «0202») tienen un desfase histórico que no se puede leer
    return Number.isNaN(date.getTime()) ? new Date(value) : date;
}

/** «sáb, 8 nov · 10:00» o, si dura varios días, «8 nov – 10 nov». */
export function activityWhen(activity: Pick<Activity, "date" | "endDate">): string | null {
    if (!activity.date) return null;
    const start = madridDate(activity.date);
    if (Number.isNaN(start.getTime())) return null;
    if (activity.endDate) {
        const end = madridDate(activity.endDate);
        if (!Number.isNaN(end.getTime()) && formatDay(start, false) !== formatDay(end, false)) {
            return `${formatDay(start, false)} – ${formatDay(end, false)}`;
        }
    }
    const time = start.toLocaleTimeString("es-ES", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });
    // Una hora en punto a medianoche suele ser «sin hora»: no se enseña
    return time === "00:00" ? formatDay(start, true) : `${formatDay(start, true)} · ${time}`;
}

export function priceLabel(price: number | null | undefined): string | null {
    if (price == null) return null;
    if (price === 0) return "Gratis";
    return `${price.toLocaleString("es-ES", { maximumFractionDigits: 2 })} €`;
}

function isOver(activity: Pick<Activity, "date" | "endDate">, now: Date): boolean {
    return activity.date ? madridDate(activity.endDate ?? activity.date) < now : false;
}

export function activityCardVersion(activity: Activity, now = new Date()): string {
    return cardVersion(activity.name, activity.date, activity.endDate, activity.location, activity.price, activity.image,
        activity.status?.value, activity.project?.name, isOver(activity, now));
}

export function activityCard(activity: Activity, now = new Date()): ShareCard {
    const status = activity.status?.value;
    const past = isOver(activity, now);
    const badge: ShareCard["badge"] =
        status === "CANCELLED" ? { label: "Cancelada", tone: "negative" }
        : past ? { label: "Ya celebrada", tone: "neutral" }
        : status === "OPEN_REGISTRATION" ? { label: "Inscripciones abiertas", tone: "positive" }
        : status === "REGISTRATION_CLOSED" ? { label: "Plazas cerradas", tone: "neutral" }
        : status === "PLANNED" ? { label: "Próximamente", tone: "neutral" }
        : null;

    return {
        eyebrow: activity.project?.name ?? "Actividad",
        title: activity.name,
        details: [activityWhen(activity), activity.location, priceLabel(activity.price)],
        badge,
        image: activity.image,
    };
}

export interface ShareableProject {
    name: string;
    season?: string | null;
    image?: string | null;
    signatureColor?: string | null;
    active?: boolean;
    /** El equipo del proyecto: sus caras salen en la tarjeta. */
    staff?: { photo?: string | null }[];
}

export function projectCardVersion(project: ShareableProject): string {
    return cardVersion(projectCard(project));
}

export function projectCard(project: ShareableProject): ShareCard {
    const staff = project.staff ?? [];
    return {
        eyebrow: project.season ? `Proyecto · ${project.season}` : "Proyecto",
        title: project.name,
        details: [staff.length > 0 && `Con ${plural(staff.length, "monitor/a", "monitores")}`],
        badge: project.active === false ? { label: "Archivado", tone: "neutral" } : null,
        image: project.image,
        accent: project.signatureColor,
        people: staffPhotos(staff),
    };
}

const ROLE_INVITE: Record<GroupRole, string> = {
    PARENT: "Te invitan a unirte como familia",
    COORDINATOR: "Te invitan a unirte como coordinador/a",
    MONITOR: "Te invitan a unirte como monitor/a",
};

export interface ShareableInvitation {
    projectName: string;
    role: GroupRole;
    used: boolean;
    expired: boolean;
    disabled: boolean;
}

/** Invitación a un proyecto con un rol. Si ya no vale, la tarjeta lo dice en vez de animar a entrar. */
export function projectInvitationCard(invitation: ShareableInvitation, project?: ShareableProject | null): ShareCard {
    const unusable = invitation.expired || invitation.disabled || invitation.used;
    return {
        eyebrow: "Invitación",
        title: invitation.projectName,
        details: [ROLE_INVITE[invitation.role] ?? "Te invitan a unirte"],
        badge: unusable ? { label: invitation.expired ? "Caducada" : "Ya no disponible", tone: "negative" } : null,
        image: project?.image,
        accent: project?.signatureColor,
    };
}

/** Invitación a darse de alta en la plataforma (sin proyecto concreto). */
export function invitationCard(): ShareCard {
    return {
        eyebrow: "Invitación",
        title: "Te han invitado a Yambo",
        details: ["Crea tu cuenta y únete a la asociación"],
    };
}

/* ── Páginas fijas ───────────────────────────────────────────────── */

/** Lista cerrada: la ruta `/og/:pagina` no dibuja nada que no esté aquí. */
export const SHARE_PAGES = ["inicio", "actividades", "equipo", "proyectos", "contacto"] as const;
export type SharePage = (typeof SHARE_PAGES)[number];

export function isSharePage(page: string): page is SharePage {
    return (SHARE_PAGES as readonly string[]).includes(page);
}

/** Cuántas caras caben en la fila de fotos antes del «+N». */
export const MAX_PEOPLE = 7;

function staffPhotos(staff: { photo?: string | null }[]): string[] {
    return staff.map((member) => member.photo).filter((photo): photo is string => !!photo);
}

function upcoming(activities: Activity[], now: Date): Activity[] {
    return activities
        .filter((activity) => isIndexableActivity(activity, now))
        .sort((a, b) => madridDate(a.date!).getTime() - madridDate(b.date!).getTime());
}

function plural(count: number, one: string, many: string): string {
    return `${count} ${count === 1 ? one : many}`;
}

/** Lo que dice la tarjeta de la portada si en el admin no se ha escrito otra cosa. */
export const HOME_SHARE_DEFAULTS = {
    eyebrow: "Asociación juvenil · Alcobendas",
    title: "Vive, aprende y crece con Yambo",
    subtitle: "Ocio educativo y tiempo libre para jóvenes",
};

/**
 * Portada: textos e imagen desde Página principal → Al compartir (`home.share.*`).
 * Sin imagen propia usa la del hero, que es la foto que ya representa la web.
 */
export function homeCard(settings: Record<string, string | undefined>): ShareCard {
    const value = (key: string) => settings[`home.share.${key}`]?.trim() || undefined;
    return {
        eyebrow: value("eyebrow") ?? HOME_SHARE_DEFAULTS.eyebrow,
        title: value("title") ?? HOME_SHARE_DEFAULTS.title,
        details: [value("subtitle") ?? HOME_SHARE_DEFAULTS.subtitle],
        image: value("image") ?? (settings["home.hero.image"]?.trim() || null),
    };
}

/** El listado enseña la próxima actividad (con su cartel), que es lo que quiere ver quien recibe el enlace. */
export function activitiesCard(activities: Activity[], now = new Date()): ShareCard {
    const next = upcoming(activities, now);
    if (next.length === 0) {
        return { eyebrow: "Actividades", title: "Actividades de Yambo", details: ["Ocio educativo y tiempo libre en Alcobendas"] };
    }
    const [first] = next;
    return {
        eyebrow: next.length > 1 ? `${plural(next.length, "actividad", "actividades")} próximas` : "Próxima actividad",
        title: first.name,
        details: [activityWhen(first), first.location, priceLabel(first.price)],
        badge: first.status?.value === "OPEN_REGISTRATION" ? { label: "Inscripciones abiertas", tone: "positive" } : null,
        image: first.image,
    };
}

export function staffCard(staff: { photo?: string | null }[]): ShareCard {
    return {
        eyebrow: "Equipo",
        title: "Conoce al equipo de Yambo",
        details: [staff.length > 0 && plural(staff.length, "monitor/a y coordinador/a", "monitores y coordinadores")],
        people: staffPhotos(staff),
    };
}

export function projectsCard(projects: { name: string }[]): ShareCard {
    return {
        eyebrow: "Proyectos",
        title: "Los proyectos de Yambo",
        details: projects.length > 0 ? [projects.map((project) => project.name).join(" · ")] : ["Ocio educativo y tiempo libre en Alcobendas"],
    };
}

/** Correo e Instagram, que es por donde se escribe a la asociación. */
export function contactCard(settings: Record<string, string | undefined>): ShareCard {
    const instagram = settings["contact.instagram"]?.trim();
    const handle = instagram && `@${instagram.replace(/\/+$/, "").split("/").pop()!.replace(/^@/, "")}`;
    return {
        eyebrow: "Contacto",
        title: "¿Hablamos?",
        details: [settings["contact.email"], handle],
    };
}

export function legalCard(page: { title: string }): ShareCard {
    return { eyebrow: "Información legal", title: page.title };
}
