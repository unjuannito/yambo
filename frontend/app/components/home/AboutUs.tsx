import React, { useState, useRef } from "react";
import { fireConfetti } from "~/utils/confetti";

interface AboutBullet {
  icon: string;
  title: string;
  description: string;
  link: string;
}

interface AboutUsProps {
  title?: string;
  intro?: string;
  bulletsJson?: string;
  image?: string;
  loading?: boolean;
}

const DEFAULT_INTRO = "Somos una asociación juvenil con sede en Alcobendas. Nuestro objetivo es acompañar a jóvenes como tú a crecer, aprender y vivir experiencias únicas.";
const DEFAULT_BULLETS: AboutBullet[] = [
  {
    icon: "\u270E",
    title: "Formación y talleres",
    description: "Accede a experiencias educativas únicas para potenciar tus habilidades.",
    link: "/formacion"
  },
  {
    icon: "\u2726",
    title: "Voluntariado y comunidad",
    description: "Contribuye a un impacto social positivo junto a otros jóvenes comprometidos.",
    link: "/voluntariado"
  },
  {
    icon: "\u2605",
    title: "Eventos y excursiones",
    description: "Participa en salidas, campamentos y actividades culturales inolvidables.",
    link: "/eventos"
  },
  {
    icon: "\u273F",
    title: "Apoyo académico y mentoría",
    description: "Recibe ayuda con tus estudios y orientación personalizada.",
    link: "/apoyo"
  },
];
const DEFAULT_IMAGE = "/gallery-preview.jpg";

function parseBullets(json?: string): AboutBullet[] {
  if (!json) return DEFAULT_BULLETS;
  try {
    return JSON.parse(json) as AboutBullet[];
  } catch {
    return DEFAULT_BULLETS;
  }
}

export default function AboutUs({ title, intro, bulletsJson, image, loading }: AboutUsProps) {
  const bullets = parseBullets(bulletsJson);
  const [rainbowActive, setRainbowActive] = useState(false);
  const [bouncingIcons, setBouncingIcons] = useState<Set<number>>(new Set());
  const [secretText, setSecretText] = useState(false);
  const clickSequenceRef = useRef<number[]>([]);
  const sequenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleBulletClick(idx: number) {
    setBouncingIcons((prev) => new Set([...prev, idx]));
    setTimeout(() => {
      setBouncingIcons((prev) => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
    }, 500);

    clickSequenceRef.current.push(idx);
    if (sequenceTimerRef.current) clearTimeout(sequenceTimerRef.current);
    sequenceTimerRef.current = setTimeout(() => {
      clickSequenceRef.current = [];
    }, 5000);

    const seq = clickSequenceRef.current;
    if (
      seq.length >= 4 &&
      seq[seq.length - 4] === 0 &&
      seq[seq.length - 3] === 1 &&
      seq[seq.length - 2] === 2 &&
      seq[seq.length - 1] === 3
    ) {
      clickSequenceRef.current = [];
      setRainbowActive(true);
      setSecretText(true);
      fireConfetti();
      setTimeout(() => {
        setRainbowActive(false);
        setSecretText(false);
      }, 3000);
    }
  }

  return (
    <section className={`w-full py-20 bg-yambo-white relative overflow-hidden ${rainbowActive ? "ee-rainbow" : ""}`}>
      {/* Decorative blob */}
      <div className="blob-purple -top-20 -right-32 opacity-50" />

      <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center relative z-10">
        <div className="fade-up">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-5 text-yambo-black font-display">
            {title || "¿Qué es Yambo?"}
          </h2>
          {loading ? (
            <>
              <div className="h-5 w-full mb-2 bg-gray-200 rounded-xl animate-pulse" />
              <div className="h-5 w-3/4 mb-6 bg-gray-200 rounded-xl animate-pulse" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-2xl animate-pulse" />
                  <div className="flex-1">
                    <div className="h-5 w-1/3 mb-1 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-4 w-2/3 bg-gray-200 rounded-lg animate-pulse" />
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <p className="mb-8 text-lg text-gray-600 leading-relaxed">
                {intro || DEFAULT_INTRO}
              </p>
              <ul className="space-y-5 stagger">
                {bullets.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-4 group fade-up bg-gradient-to-r from-yambo-green-50/50 to-transparent p-3 rounded-2xl hover:from-yambo-green-50 transition-all duration-300"
                  >
                    <div
                      className={`text-2xl w-10 h-10 flex items-center justify-center cursor-pointer select-none bg-white rounded-2xl shadow-sm transition-transform ${bouncingIcons.has(idx) ? "ee-bounce-scale" : "group-hover:scale-110"}`}
                      onClick={() => handleBulletClick(idx)}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <strong className="block text-lg font-semibold text-yambo-black">
                        {item.title}
                      </strong>
                      <p className="text-sm text-gray-500">{item.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
              {secretText && (
                <p className="text-sm text-yambo-purple-600 font-semibold mt-4 ee-slide-down">
                  ✨ ¡Has descubierto el poder de Yambo! ✨
                </p>
              )}
              <a
                href="/proyectos"
                className="inline-flex items-center gap-1 text-yambo-green-600 text-sm font-semibold hover:text-yambo-green-700 mt-4 transition-colors"
              >
                Lee más →
              </a>
            </>
          )}
        </div>

        <div className="relative group fade-up" style={{ animationDelay: "0.2s" }}>
          <div className="absolute -inset-3 bg-gradient-to-br from-yambo-green-200 to-yambo-purple-200 rounded-3xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
          <img
            src={image || DEFAULT_IMAGE}
            alt="Actividades de Yambo"
            className="relative rounded-3xl shadow-xl object-cover w-full h-full"
          />
        </div>
      </div>
    </section>
  );
}
