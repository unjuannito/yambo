import type { EmailToken } from "mailcanvas";
export const COMPONENT_SAMPLE_DATA: Record<string, unknown> = {
  organizationName: "Yambo",
  organizacion: "Yambo",
  currentYear: 2026,
  preferencesUrl: "https://yambo.example/mi-espacio/cuenta",
  enlace_preferencias: "https://yambo.example/mi-espacio/cuenta",
  dominio: "https://yambo.example",
  headerTitle: "Tu próxima actualización",
  headerColor: "#33a35e",
  emailDate: "13/11/2026 10:00",
};
const VARIABLE_NAME = /^[a-zA-Z_$][\w$]*$/;
export const isVariableName = (value: string) => VARIABLE_NAME.test(value);
export type SampleKind =
  | "text"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "email"
  | "url"
  | "image"
  | "date"
  | "datetime"
  | "color";
export const SAMPLE_VALUES: Record<SampleKind, string> = {
  text: "Ejemplo",
  email: "lucia@example.com",
  url: "https://yambo.example/actividades",
  image: "/logo.png",
  date: "2026-11-13",
  datetime: "2026-11-13T10:00",
  color: "#23834d",
  number: "42",
  boolean: "true",
  object: '{"nombre":"Lucía","email":"lucia@example.com"}',
  array: '[{"nombre":"Bolso","precio":24},{"nombre":"Cuaderno","precio":12}]',
};
const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
export function parseSampleData(source: string): Record<string, unknown> {
  const data: unknown = JSON.parse(source);
  if (!isObject(data))
    throw new Error("Usa un objeto JSON con los nombres de tus variables.");
  if (Object.keys(data).some((key) => !isVariableName(key)))
    throw new Error(
      "Los nombres deben empezar por una letra y no contener espacios.",
    );
  return data;
}
function validDate(value: string): boolean {
  const date = new Date(value + "T00:00:00Z");
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function parseSampleValue(kind: SampleKind, source: string): unknown {
  const structured = ["number", "boolean", "object", "array"].includes(kind);
  const value: unknown = structured ? JSON.parse(source) : source;
  const accepts: Record<SampleKind, (value: unknown) => boolean> = {
    text: (value) => typeof value === "string",
    email: (value) =>
      typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    url: (value) =>
      typeof value === "string" && /^(https?:\/\/|\/(?!\/))\S+$/i.test(value),
    image: (value) =>
      typeof value === "string" && /^(https?:\/\/|\/(?!\/))\S+$/i.test(value),
    color: (value) =>
      typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value),
    date: (value) =>
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      validDate(value),
    datetime: (value) =>
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) &&
      validDate(value.slice(0, 10)) &&
      +value.slice(11, 13) < 24 &&
      +value.slice(14) < 60,
    number: (value) => typeof value === "number" && Number.isFinite(value),
    boolean: (value) => typeof value === "boolean",
    object: isObject,
    array: Array.isArray,
  };
  if (!accepts[kind](value)) throw new Error("Sample type mismatch");
  return value;
}
export function componentTokens(data: Record<string, unknown>): EmailToken[] {
  return Object.entries(data)
    .filter(([key]) => isVariableName(key))
    .map(([varName, sample]) => ({
      token: `{{${varName}}}`,
      varName,
      label: varName,
      sample,
    }));
}
export function sampleType(value: unknown) {
  if (value === null) return "Vacío";
  if (Array.isArray(value)) return "Lista";
  if (typeof value === "object") return "Objeto";
  if (typeof value === "number") return "Número";
  if (typeof value === "boolean") return "Booleano";
  if (typeof value === "string") {
    if (/^#[0-9a-f]{6}$/i.test(value)) return "Color";
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(value)) return "Fecha";
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Email";
    if (/\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(value)) return "Imagen";
    if (/^https?:\/\//i.test(value)) return "Enlace";
  }
  return "Texto";
}

export const COMPONENT_TOKENS = componentTokens(COMPONENT_SAMPLE_DATA);
export const COMPONENT_STARTERS = [
  {
    name: "Firma",
    description: "Cierra tus correos con tu marca",
    html: '<div style="padding:20px 0;border-top:1px solid #e5e7eb;"><p style="margin:0 0 8px;color:#6b7280;">Un saludo,</p><strong th:text="${organizationName}" style="color:#33a35e;">Yambo</strong><p style="margin:8px 0 0;color:#6b7280;font-size:13px;">Estamos para ayudarte.</p></div>',
  },
  {
    name: "Aviso",
    description: "Destaca información importante",
    html: '<div style="padding:20px;background:#f0fdf4;border-left:4px solid #33a35e;border-radius:8px;"><strong>Información importante</strong><p style="margin:8px 0 0;">Escribe aquí el mensaje para tus destinatarios.</p></div>',
  },
  {
    name: "Botón",
    description: "Añade una llamada a la acción",
    html: '<div style="padding:20px 0;"><a th:href="${preferencesUrl}" style="display:inline-block;padding:12px 22px;background:#33a35e;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:bold;">Gestionar mis preferencias</a></div>',
  },
];
