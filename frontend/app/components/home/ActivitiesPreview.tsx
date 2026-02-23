import React from "react";

const activities = [
  {
    id: 1,
    date: "15 Mayo",
    time: "17:00",
    title: "Taller de Robótica",
    monitorName: "Javi",
    monitorAvatar: "/monitores/javier.jpg",
    badge: "Inscripciones abiertas",
    badgeClass: "bg-green-100 text-green-800"
  },
  {
    id: 2,
    date: "16 Mayo",
    time: "18:30",
    title: "Clínica de Fútbol",
    monitorName: "Lukas",
    monitorAvatar: "/monitores/lukas.jpg",
    badge: "Próxima",
    badgeClass: "bg-blue-100 text-blue-800"
  },
  {
    id: 3,
    date: "17 Mayo",
    time: "16:00",
    title: "Clase de Pintura",
    monitorName: "Ekiñe",
    monitorAvatar: "/monitores/ekine.jpg",
    badge: "Inscripciones cerradas",
    badgeClass: "bg-red-100 text-red-800"
  },
  {
    id: 4,
    date: "18 Mayo",
    time: "19:00",
    title: "Yoga al Aire Libre",
    monitorName: "Laura",
    monitorAvatar: "/monitores/laura.jpg",
    badge: "Inscripciones abiertas",
    badgeClass: "bg-green-100 text-green-800"
  },
  {
    id: 5,
    date: "19 Mayo",
    time: "17:30",
    title: "Taller de Teatro",
    monitorName: "MiniCampi",
    monitorAvatar: "/monitores/mini-campi.jpg",
    badge: "Próxima",
    badgeClass: "bg-blue-100 text-blue-800"
  },
  {
    id: 6,
    date: "20 Mayo",
    time: "18:00",
    title: "Charla de Medio Ambiente",
    monitorName: "Irene",
    monitorAvatar: "/monitores/irene.jpg",
    badge: "Inscripciones abiertas",
    badgeClass: "bg-green-100 text-green-800"
  },
  {
    id: 7,
    date: "21 Mayo",
    time: "17:00",
    title: "Cocina Saludable",
    monitorName: "Samuel",
    monitorAvatar: "/monitores/samu.jpg",
    badge: "Próxima",
    badgeClass: "bg-blue-100 text-blue-800"
  },
  {
    id: 8,
    date: "22 Mayo",
    time: "16:30",
    title: "Club de Lectura",
    monitorName: "Paula",
    monitorAvatar: "/monitores/paula.jpg",
    badge: "Inscripciones cerradas",
    badgeClass: "bg-red-100 text-red-800"
  }
];

export default function ActivitiesPreview({ title }: { title?: string }) {
  return (
    <section id="actividades" className="w-full bg-white py-16">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 text-gray-900">
          {title || "Actividades"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {activities.map((act) => (
            <div key={act.id} className="border rounded-lg p-4 hover:shadow-md transition">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">{act.date} · {act.time}</span>
                <span className={`text-xs px-2 py-1 rounded-full text-center ${act.badgeClass}`}>{act.badge}</span>
              </div>
              <h3 className="font-semibold text-lg mb-3">{act.title}</h3>
              <div className="flex items-center mb-4">
                <img src={act.monitorAvatar} alt={act.monitorName} className="h-8 w-8 rounded-full mr-2 object-cover" />
                <span className="text-sm text-gray-700">{act.monitorName}</span>
              </div>
              <a
                href="/actividades"
                className="inline-block mt-auto text-blue-600 hover:underline text-sm"
              >
                Ver todas
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}