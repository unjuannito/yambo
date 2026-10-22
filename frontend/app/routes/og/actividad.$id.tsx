import { getPublicActivity } from "~/services/publicService.server";
import { shareCardResponse } from "~/utils/shareCard.server";
import { activityCard } from "~/utils/shareCards";
import type { Route } from "./+types/actividad.$id";

/** og:image de una actividad pública: foto, nombre, fecha, lugar, precio y estado. */
export async function loader({ params }: Route.LoaderArgs) {
    const activity = await getPublicActivity(params.id).catch(() => null);
    if (!activity) throw new Response(null, { status: 404 });
    return shareCardResponse(activityCard(activity));
}
