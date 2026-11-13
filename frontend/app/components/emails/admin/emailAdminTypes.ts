import type { CampaignAudienceType } from "~/services/campaignService";

export interface CampaignForm {
  subject: string;
  body: string;
  audienceType: CampaignAudienceType;
  audienceRef: string;
  audienceUsers: string[];
}

export const EMPTY_CAMPAIGN_FORM: CampaignForm = {
  subject: "",
  body: "",
  audienceType: "ALL",
  audienceRef: "",
  audienceUsers: [],
};

export const AUDIENCE_TYPES: CampaignAudienceType[] = [
  "ALL",
  "PROFILE",
  "PROJECT",
  "GROUP",
  "USERS",
];

export const selectClass =
  "w-full border border-gray-200 rounded-2xl text-sm px-4 py-2.5 bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-yambo-green-300 " +
  "focus:border-yambo-green-400 shadow-sm";

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
