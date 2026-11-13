import type { EmailToken } from "mailcanvas";
const now = new Date();
const date = now.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric" });
const time = now.toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" });
const recipient = { id: "SOCIO-DEMO", nombre: "Lucía Martín", usuario: "lucia@example.com", email: "lucia@example.com" };
export const CAMPAIGN_TOKENS: EmailToken[] = [
  ["nombre", "Nombre completo", recipient.nombre], ["primerNombre", "Primer nombre", "Lucía"],
  ["usuario", "Usuario (email de acceso)", recipient.usuario], ["email", "Email", recipient.email], ["userId", "ID del socio", recipient.id],
  ["fecha", "Fecha de envío", date], ["hora", "Hora de envío", time], ["fechaHora", "Fecha y hora", `${date} ${time}`], ["anio", "Año", now.getFullYear()],
  ["organizacion", "Nombre de la organización", "Yambo"], ["dominio", "Dominio", "https://yambo.example"],
  ["destinatario", "Datos del destinatario", recipient], ["preferencesUrl", "Enlace de preferencias", "https://yambo.example/mi-espacio/cuenta"],
].map(([varName, label, sample]) => ({ token: `{{${varName}}}`, varName: String(varName), label: String(label), sample }));
