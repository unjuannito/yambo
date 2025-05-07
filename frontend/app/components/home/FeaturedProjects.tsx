const projects = [
  {
    title: "Club Infantil Barrio",
    description:
      "Realizado en el Colegio Bachiller Alonso López (Alcobendas), este proyecto educativo basado en educación no formal está destinado a niños/as de 4-12 años. Las sesiones son los viernes de 18:00 a 19:30 (puede variar).",
    image: "/proyectos/club-infantil.jpg",
    link: "/proyectos/club-infantil"
  },
  {
    title: "Club Juvenil Jamboloko",
    description:
      "Realizado en el Centro Cultural Miguel Delibes (Alcobendas), este proyecto educativo está destinado a adolescentes de 13 a 18 años. Se imparte los viernes de 18:00 a 19:30 (puede variar según la actividad).",
    image: "/proyectos/club-jamboloko.jpg",
    link: "/proyectos/club-jamboloko"
  },
  {
    title: "Cohesión",
    description:
      "Realizado con Yambo y visitantes, este proyecto ludico esta destinado a socios y visitantes. Actividades diversas para mejorar la cohesion en Yambo.",
    image: "/proyectos/cohesion.jpg",
    link: "/proyectos/club-jamboloko"
  },
];

export default function FeaturedProjects() {
  return (
    <section className="w-full bg-gray-50 py-16">
      <div className="max-w-[1400px] mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 text-gray-900">
          Proyectos Destacados
        </h2>
        <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory px-4 scrollbar-hide">
          {projects.map((project, idx) => (
            <div
              key={idx}
              className="min-w-[300px] md:min-w-[400px] snap-start bg-white shadow-lg rounded-xl overflow-hidden"
            >
              <div className="relative">
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-56 object-cover"
                />
                <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-white to-transparent" />
              </div>
              <div className="p-4">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {project.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {project.description}
                </p>
                <a
                  href={project.link}
                  className="text-blue-600 hover:underline text-sm font-medium"
                >
                  Ver proyecto →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
