import { getPublicNotice } from "~/services/publicService.server";
import { shareCardResponse } from "~/utils/shareCard.server";
import { noticeCard } from "~/utils/shareCards";
import type { Route } from "./+types/anuncio.$id";

/** og:image de los anuncios públicos del tablón. */
export async function loader({ params }: Route.LoaderArgs) {
    const notice = await getPublicNotice(params.id).catch(() => null);
    if (!notice) throw new Response(null, { status: 404 });
    return shareCardResponse(noticeCard(notice));
}
