import type { EmailToken } from "mailcanvas";
export const COMPONENT_SAMPLE_DATA: Record<string, unknown> = {
  organizationName: "Yambo", organizacion: "Yambo", currentYear: 2026,
  preferencesUrl: "https://yambo.example/mi-espacio/cuenta", enlace_preferencias: "https://yambo.example/mi-espacio/cuenta",
  dominio: "https://yambo.example", headerTitle: "Tu próxima actualización", headerColor: "#33a35e", emailDate: "13/11/2026 10:00",
};
export function componentTokens(data: Record<string, unknown>): EmailToken[] {
  return Object.entries(data).filter(([key]) => /^[a-zA-Z_$][\w$]*$/.test(key)).map(([varName, sample]) => ({ token: `{{${varName}}}`, varName, label: varName, sample }));
}
export function sampleType(value: unknown) {
  return value === null ? "Vacío" : Array.isArray(value) ? "Lista" : typeof value === "object" ? "Objeto" : typeof value === "number" ? "Número" : typeof value === "boolean" ? "Booleano" : "Texto";
}
export const COMPONENT_TOKENS = componentTokens(COMPONENT_SAMPLE_DATA);
export const COMPONENT_STARTERS = [
  { name: "Firma", description: "Cierra tus correos con tu marca", html: '<div style="padding:20px 0;border-top:1px solid #e5e7eb;"><p style="margin:0 0 8px;color:#6b7280;">Un saludo,</p><strong th:text="${organizationName}" style="color:#33a35e;">Yambo</strong><p style="margin:8px 0 0;color:#6b7280;font-size:13px;">Estamos para ayudarte.</p></div>' },
  { name: "Aviso", description: "Destaca información importante", html: '<div style="padding:20px;background:#f0fdf4;border-left:4px solid #33a35e;border-radius:8px;"><strong>Información importante</strong><p style="margin:8px 0 0;">Escribe aquí el mensaje para tus destinatarios.</p></div>' },
  { name: "Botón", description: "Añade una llamada a la acción", html: '<div style="padding:20px 0;"><a th:href="${preferencesUrl}" style="display:inline-block;padding:12px 22px;background:#33a35e;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:bold;">Gestionar mis preferencias</a></div>' },
];
