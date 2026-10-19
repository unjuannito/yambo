import { getProjectDetail, getProjectRoleInvitationInfo } from "~/services/publicService.server";
import { shareCardResponse } from "~/utils/shareCard.server";
import { invitationCard, projectInvitationCard } from "~/utils/shareCards";
import type { Route } from "./+types/invitacion.$token";

/** og:image del enlace de invitación a un proyecto: a qué proyecto y con qué rol. */
export async function loader({ params }: Route.LoaderArgs) {
    const invitation = await getProjectRoleInvitationInfo(params.token).catch(() => null);
    // Un enlace que no existe recibe la tarjeta genérica: no se confirma ni desmiente nada
    if (!invitation) return shareCardResponse(invitationCard());
    const project = await getProjectDetail(invitation.projectId).catch(() => null);
    return shareCardResponse(projectInvitationCard(invitation, project));
}
