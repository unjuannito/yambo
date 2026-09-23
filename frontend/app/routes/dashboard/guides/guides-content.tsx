// GENERADO a partir de guides/index.tsx — índice de guías.
// Cada artículo vive en articles/<slug>.tsx; aquí solo metadatos + mapa de componentes.
import type { JSX } from "react";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import {
    faClipboardCheck,
    faClipboardList,
    faEnvelopesBulk,
    faGear,
    faMagnifyingGlass,
    faPenToSquare,
    faShieldHalved,
} from "@fortawesome/free-solid-svg-icons";
import { GuideConfiguracion } from "./articles/configuracion";
import { GuidePaginaPrincipal } from "./articles/pagina-principal";
import { GuideInvitaciones } from "./articles/invitaciones";
import { GuidePerfiles } from "./articles/perfiles";
import { GuideSeo } from "./articles/seo";
import { GuideOauthGoogle } from "./articles/oauth-google";
import { GuideFlujosDeTrabajo } from "./articles/flujos-de-trabajo";
import { GuidePedidos } from "./articles/pedidos";

// NOTA i18n (excepción documentada, 2026-08-22):
// El contenido de las guías (párrafos, pasos, instrucciones) está en español
// hardcoded a propósito. Es CONTENIDO documental, no UI traducible: la wiki
// solo existe en español y no hay plan de traducirla. La regla "todo texto
// visible con t()" aplica a la UI de la app, no a esta prosa. No migrar a
// i18n — añadiría ~170 claves a es.json sin beneficio.

export interface GuideMeta {
    id: string;
    title: string;
    description: string;
    icon: any;
}

export const GUIDES: GuideMeta[] = [
    { id: "configuracion", title: "Configuración general", description: "Ajustes de la web accesibles desde «Configuración» en el menú de administración", icon: faGear },
    { id: "pagina-principal", title: "Editar la Página Principal", description: "El contenido que ven los visitantes en la portada de la web", icon: faPenToSquare },
    { id: "invitaciones", title: "Invitaciones: cómo dar de alta a nuevos socios", description: "Hay tres formas de invitar, según cómo quieras que se registre la persona", icon: faEnvelopesBulk },
    { id: "perfiles", title: "Perfiles y permisos", description: "Los perfiles agrupan permisos y determinan qué puede hacer cada persona en la web", icon: faShieldHalved },
    { id: "seo", title: "SEO: posicionamiento en buscadores", description: "Títulos, descripciones y metadatos de las páginas públicas", icon: faMagnifyingGlass },
    { id: "oauth-google", title: "Activar «Iniciar sesión con Google»", description: "Guía paso a paso para administradores no técnicos", icon: faGoogle },
    { id: "flujos-de-trabajo", title: "Flujos de trabajo", description: "Estados y transiciones de incidencias, pedidos, colecciones, invitaciones y actividades", icon: faClipboardCheck },
    { id: "pedidos", title: "Gestión de pedidos (administradores)", description: "Cómo crear, editar y trazar pedidos de socios con justificación e incidencia vinculada", icon: faClipboardList },
];

export const GUIDE_COMPONENTS: Record<string, () => JSX.Element> = {
    "configuracion": GuideConfiguracion,
    "pagina-principal": GuidePaginaPrincipal,
    "invitaciones": GuideInvitaciones,
    "perfiles": GuidePerfiles,
    "seo": GuideSeo,
    "oauth-google": GuideOauthGoogle,
    "flujos-de-trabajo": GuideFlujosDeTrabajo,
    "pedidos": GuidePedidos,
};
