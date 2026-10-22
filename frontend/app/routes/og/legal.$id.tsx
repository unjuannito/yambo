import { getPublishedLegalPage } from "~/services/publicService.server";
import { shareCardResponse } from "~/utils/shareCard.server";
import { legalCard } from "~/utils/shareCards";
import type { Route } from "./+types/legal.$id";

/** og:image de las páginas legales publicadas. */
export async function loader({ params }: Route.LoaderArgs) {
    const page = await getPublishedLegalPage(params.id).catch(() => null);
    if (!page) throw new Response(null, { status: 404 });
    return shareCardResponse(legalCard(page));
}
