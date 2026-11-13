import { describe, expect, it } from "vitest";
import { CAMPAIGN_TOKENS } from "./campaignVariables";
describe("campaign variable catalog", () => {
  it("exposes recipient fields, send dates and a structured recipient example", () => {
    expect(CAMPAIGN_TOKENS.map((token) => token.varName)).toEqual(expect.arrayContaining(["nombre","primerNombre","usuario","email","fecha","hora","fechaHora","anio","organizacion","dominio","destinatario"]));
    expect(CAMPAIGN_TOKENS.find((token) => token.varName === "destinatario")?.sample).toEqual(expect.objectContaining({nombre:"Lucía Martín",email:"lucia@example.com"}));
    expect(new Set(CAMPAIGN_TOKENS.map((token) => token.varName)).size).toBe(CAMPAIGN_TOKENS.length);
  });
});
