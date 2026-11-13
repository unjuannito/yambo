import { useEffect, useState } from "react";
import { campaignService } from "~/services/campaignService";
import { CAMPAIGN_TOKENS } from "./campaignVariables";
import { toEmailTokens } from "./emailEditorAdapter";

export function useCampaignVariables() {
  const [tokens, setTokens] = useState(CAMPAIGN_TOKENS);
  useEffect(() => {
    let active = true;
    campaignService
      .variables()
      .then((items) => {
        if (active && items.length) setTokens(toEmailTokens(items));
      })
      .catch(() => {
        /* Keep the complete local catalog available offline. */
      });
    return () => {
      active = false;
    };
  }, []);
  return tokens;
}
