import { shareCardResponse } from "~/utils/shareCard.server";
import { invitationCard } from "~/utils/shareCards";

/** og:image de las invitaciones para darse de alta, que no van ligadas a un proyecto. */
export async function loader() {
    return shareCardResponse(invitationCard());
}
