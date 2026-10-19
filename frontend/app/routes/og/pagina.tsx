import {
    getActiveProjects,
    getContactSettings,
    getHomeSettings,
    getPublicActivities,
    getStaff,
} from "~/services/publicService.server";
import { shareCardResponse } from "~/utils/shareCard.server";
import {
    activitiesCard,
    contactCard,
    homeCard,
    isSharePage,
    projectsCard,
    staffCard,
    type ShareCard,
    type SharePage,
} from "~/utils/shareCards";
import type { Route } from "./+types/pagina";

const CARDS: Record<SharePage, () => Promise<ShareCard>> = {
    inicio: async () => homeCard(await getHomeSettings()),
    actividades: async () => activitiesCard(await getPublicActivities()),
    equipo: async () => staffCard(await getStaff()),
    proyectos: async () => projectsCard(await getActiveProjects()),
    contacto: async () => contactCard(await getContactSettings()),
};

/** og:image de las páginas fijas de la web pública (portada, listados, contacto). */
export async function loader({ params }: Route.LoaderArgs) {
    if (!isSharePage(params.page)) throw new Response(null, { status: 404 });
    const card = await CARDS[params.page]().catch(() => null);
    if (!card) throw new Response(null, { status: 503 });
    return shareCardResponse(card);
}
