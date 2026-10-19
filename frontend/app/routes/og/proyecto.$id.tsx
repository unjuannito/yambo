import { getProjectDetail } from "~/services/publicService.server";
import { shareCardResponse } from "~/utils/shareCard.server";
import { projectCard } from "~/utils/shareCards";
import type { Route } from "./+types/proyecto.$id";

/** og:image de un proyecto: su foto y su color. */
export async function loader({ params }: Route.LoaderArgs) {
    const project = await getProjectDetail(params.id).catch(() => null);
    if (!project) throw new Response(null, { status: 404 });
    return shareCardResponse(projectCard(project));
}
