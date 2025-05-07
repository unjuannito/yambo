import React from "react";

interface Monitor {
    id: number;
    photo: string;
    name: string;
    group: string;
    bio: string;
}

const monitors: Monitor[] = [
    {
        id: 1,
        photo: "/monitores/paula.jpg",
        name: "Paula",
        group: "Peques",
        bio: "¡Hola! Soy Paula. Estudio para llegar a ser profe porque me encantan los niños, especialmente los yamberos. ¡Me gustan muchísimo los abrazos, hacer cosquillas y reír! Mi parte favorita de los viernes es cuando cantamos todos juntos alguna canción. Entré en Yambo hace poquito y estoy súper contenta."
    },
    {
        id: 2,
        photo: "/monitores/lukas.jpg",
        name: "Lukas",
        group: "Medianos",
        bio: "Estudiante de artes, me uní a Yambo porque quería hacer algo nuevo y al final me acaba gustando. Este es mi primer año de monitor porque llevaba tiempo queriendo hacer de niñero y esta fue la oportunidad perfecta."
    },
    {
        id: 3,
        photo: "/monitores/irene.jpg",
        name: "Irene",
        group: "Mayores",
        bio: "¡Holaa! Me llamo Irene. Soy Técnico en Emergencias Sanitarias y estudio Integración Social. En un futuro me gustaría estudiar enfermería. Fui niña de Yambo y no me quería ir, así que me quedé como monitor y cada día estoy más contenta."
    },
    {
        id: 4,
        photo: "/monitores/samu.jpg",
        name: "Samu",
        group: "Jambo",
        bio: "Amante de los animales (sobre todo los pandas). Cuarto año en Yambo con ganas de volver a las actividades y jugar a todos los juegos posibles. Súper fanático del verano y de bajar al parque a jugar a las cartas o juegos de mesa."
    },
    {
        id: 5,
        photo: "/monitores/mini-campi.jpg",
        name: "Mini Campi",
        group: "Jambo",
        bio: "Musicólogo y técnico de sonido. Amante de la música, el arte, la historia, la política, los animales y el campo. Llevo casi 9 años en Yambo, soy presidente de la asociación y coordinador titulado de Jamboloko."
    },
    {
        id: 6,
        photo: "/monitores/javier.jpg",
        name: "Javier",
        group: "Mayores",
        bio: "Soy Javier, informático que estudia desarrollo de aplicaciones web. Entré como niño en 2018 y ahora en 2022 decidí evolucionar a moni. ¡Encantado de compartir mis conocimientos!"
    },
    {
        id: 7,
        photo: "/monitores/ekine.jpg",
        name: "Ekiñe",
        group: "Peques",
        bio: "Estudio Filología Clásica porque en el futuro quiero ser profesora o dedicarme a la investigación. Entré en Yambo para probar cosas nuevas y descubrí que me encanta ser moni. ¡Espero seguir muchos años más!"
    },
    {
        id: 8,
        photo: "/monitores/lucia.jpg",
        name: "Lucía",
        group: "Mayores",
        bio: "Estoy estudiando Artes, aunque me encantan la filosofía y la psicología. También me apasiona el teatro, las manualidades, la música y hacer reír. Fui niña de Yambo y he vuelto como moni con muchas ganas."
    },
    {
        id: 9,
        photo: "/monitores/laura.jpg",
        name: "Laura",
        group: "Medianos",
        bio: "Estudiante de Integración Social y futura psicóloga. Este es mi primer año como moni y estoy súper feliz de ser yambera. ¡Nos vemos en las actividades!"
    },
];

export default function MonitorsGallery() {
    return (
        <section id="monitores" className="w-full bg-white py-16">
            <div className="max-w-6xl mx-auto px-4">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Equipo de Monitores</h2>
                <div className="flex space-x-6 overflow-x-auto snap-x snap-mandatory no-scrollbar py-2">
                    {monitors.map((monitor) => (
                        <div
                            key={monitor.name}
                            className="min-w-[220px] h-[320px] rounded-xl shadow-md overflow-hidden bg-gray-50 flex-shrink-0"
                        >
                            <div className="w-full h-[220px] overflow-hidden">
                                <img
                                    src={monitor.photo}
                                    alt={monitor.name}
                                    className="w-full h-full object-cover"
                                    style={{ objectPosition: "center top -10px" }}
                                />
                            </div>
                            <div className="p-3">
                                <h3 className="text-lg font-semibold">{monitor.name}</h3>
                                <p className="text-sm text-gray-600">{monitor.group}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
