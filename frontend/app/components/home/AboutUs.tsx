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
    // Add bounce animation for this icon
    setBouncingIcons((prev) => new Set([...prev, idx]));
    setTimeout(() => {
      setBouncingIcons((prev) => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
    }, 500);

    // Track click sequence
    clickSequenceRef.current.push(idx);
    if (sequenceTimerRef.current) clearTimeout(sequenceTimerRef.current);
    sequenceTimerRef.current = setTimeout(() => {
      clickSequenceRef.current = [];
    }, 5000);

    // Check if sequence is 0, 1, 2, 3 (in order)
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
    <section className={`w-full py-16 bg-white text-gray-900 ${rainbowActive ? "ee-rainbow" : ""}`}>
      <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{title || "¿Qué es Yambo?"}</h2>
          {loading ? (
            <>
              <div className="h-5 w-full mb-2 bg-gray-200 rounded animate-pulse" />
              <div className="h-5 w-3/4 mb-6 bg-gray-200 rounded animate-pulse" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
                  <div className="flex-1">
                    <div className="h-5 w-1/3 mb-1 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <p className="mb-6 text-lg">
                {intro || DEFAULT_INTRO}
              </p>
              <ul className="space-y-4">
                {bullets.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 group relative"
                  >
                    <div
                      className={`text-2xl w-8 cursor-pointer select-none transition-transform ${bouncingIcons.has(idx) ? "ee-bounce-scale" : ""}`}
                      onClick={() => handleBulletClick(idx)}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <strong className="block text-lg font-semibold">
                        {item.title}
                      </strong>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
              {secretText && (
                <p className="text-sm text-purple-600 font-semibold mt-3 ee-slide-down">
                  ✨ ¡Has descubierto el poder de Yambo! ✨
                </p>
              )}
              <a
                href=''
                className="text-blue-600 text-sm hover:underline mt-1 inline-block"
              >
                Lee más
              </a>
            </>
          )}
        </div>

        <div className="relative group">
          <img
            src={image || DEFAULT_IMAGE}
            alt="Actividades de Yambo"
            className="rounded-lg shadow-lg object-cover w-full h-full"
          />
        </div>
      </div>
    </section>
  );
}
