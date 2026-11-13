export interface CampaignStarter {
  key: string;
  name: string;
  description: string;
  subject: string;
  body: string;
}

function body(
  title: string,
  introduction: string,
  details: string,
  path: string,
  action: string,
): string {
  return `<div style="font-family:Arial,sans-serif;color:#23352b;line-height:1.6;">
    <p style="color:#23834d;font-size:12px;font-weight:bold;letter-spacing:2px;">COMUNIDAD · \${organizacion}</p>
    <h1 style="font-size:28px;line-height:1.2;margin:12px 0 24px;">${title}</h1>
    <p>Hola \${primerNombre},</p><p>${introduction}</p>
    <div style="padding:20px;background-color:#edf7f0;border-radius:12px;margin:24px 0;">${details}</div>
    <p><a href="\${dominio}${path}" style="display:inline-block;background-color:#299858;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;">${action}</a></p>
    <p style="margin-top:28px;">¡Nos vemos pronto!<br>El equipo de \${organizacion}</p>
  </div>`;
}

export const CAMPAIGN_STARTERS: CampaignStarter[] = [
  {
    key: "inscripciones",
    name: "Inscripciones a proyectos",
    description:
      "Invita a los socios a conocer los proyectos y consultar cómo participar.",
    subject: "Descubre los proyectos de ${organizacion}",
    body: body(
      "Un nuevo proyecto empieza contigo",
      "Queremos compartir contigo los proyectos de nuestra asociación. Consulta las propuestas y la información para participar desde la web.",
      '<h2 style="margin-top:0;font-size:18px;">Antes de apuntarte</h2><p>Revisa la descripción del proyecto, sus grupos y las condiciones de participación.</p><p><strong>Personaliza este bloque:</strong> añade el nombre del proyecto, el plazo y las instrucciones de inscripción.</p>',
      "/proyectos",
      "Consultar proyectos",
    ),
  },
  {
    key: "actividades",
    name: "Próximas actividades",
    description:
      "Presenta una actividad y lleva a los socios a la agenda de la web.",
    subject: "Tu próxima actividad con ${organizacion}",
    body: body(
      "Hagamos algo juntos",
      "Tenemos ganas de compartir nuevas experiencias contigo. Consulta las actividades publicadas en la web y encuentra tu próxima cita con la asociación.",
      '<h2 style="margin-top:0;font-size:18px;">Completa los detalles de la actividad</h2><p><strong>Actividad:</strong> escribe el nombre.<br><strong>Cuándo y dónde:</strong> añade fecha, hora y lugar.<br><strong>Inscripción:</strong> indica el plazo y las condiciones.</p>',
      "/actividades",
      "Ver actividades",
    ),
  },
  {
    key: "articulos",
    name: "Artículos y pedidos",
    description:
      "Anuncia artículos de la asociación y enlaza al catálogo para socios.",
    subject: "Novedades en los artículos de ${organizacion}",
    body: body(
      "Lleva la asociación contigo",
      "Visita el catálogo de artículos en tu espacio de socio. Allí puedes consultar las opciones disponibles y preparar tu pedido.",
      '<h2 style="margin-top:0;font-size:18px;">Información de esta campaña</h2><p>Añade aquí los artículos destacados, las fechas de disponibilidad y las indicaciones de recogida. Confirma los precios y plazos antes de enviar.</p>',
      "/mi-espacio/articulos",
      "Ver artículos",
    ),
  },
  {
    key: "novedades",
    name: "Novedades de la asociación",
    description:
      "Un boletín para compartir noticias, proyectos y próximos encuentros.",
    subject: "Lo nuevo en ${organizacion}",
    body: body(
      "Así se mueve nuestra comunidad",
      "Te acercamos las novedades de la asociación para que no te pierdas lo que estamos preparando.",
      '<h2 style="margin-top:0;font-size:18px;">Noticias de este mes</h2><p>Sustituye este texto por una noticia real de la asociación.</p><h2 style="font-size:18px;">Lo que viene</h2><p>Añade próximos proyectos, actividades y formas de participar.</p>',
      "/",
      "Visitar la web",
    ),
  },
];

export function starterPreview(starter: CampaignStarter): string {
  return `<html lang="es"><body style="margin:0;padding:24px;background:#fff;">${starter.body.replaceAll("${organizacion}", "Yambo").replaceAll("${primerNombre}", "Lucía").replaceAll("${dominio}", "https://yambo.example")}</body></html>`;
}
