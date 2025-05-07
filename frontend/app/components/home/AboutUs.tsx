import React from "react";

const bullets = [
  {
    icon: "🎓",
    title: "Formación y talleres",
    description: "Accede a experiencias educativas únicas para potenciar tus habilidades.",
    link: "/formacion"
  },
  {
    icon: "🤝",
    title: "Voluntariado y comunidad",
    description: "Contribuye a un impacto social positivo junto a otros jóvenes comprometidos.",
    link: "/voluntariado"
  },
  {
    icon: "🎉",
    title: "Eventos y excursiones",
    description: "Participa en salidas, campamentos y actividades culturales inolvidables.",
    link: "/eventos"
  },
  {
    icon: "📚",
    title: "Apoyo académico y mentoría",
    description: "Recibe ayuda con tus estudios y orientación personalizada.",
    link: "/apoyo"
  },
];

export default function AboutUs() {
  return (
    <section className="w-full py-16 bg-white text-gray-900">
      <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">¿Qué es Yambo?</h2>
          <p className="mb-6 text-lg">
            Somos una asociación juvenil con sede en Alcobendas. Nuestro objetivo es acompañar a jóvenes como tú a crecer, aprender y vivir experiencias únicas.
          </p>
          <ul className="space-y-4">
            {bullets.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 group relative"
              >
                <div className="text-2xl w-8">{item.icon}</div>
                <div>
                  <strong className="block text-lg font-semibold">
                    {item.title}
                  </strong>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
          <a
            href=''
            className="text-blue-600 text-sm hover:underline mt-1 inline-block"
          >
            Lee más
          </a>

        </div>

        <div className="relative group">
          <img
            src="/gallery-preview.jpg"
            alt="Actividades de Yambo"
            className="rounded-lg shadow-lg object-cover w-full h-full"
          />
        </div>
      </div>
    </section>
  );
}
