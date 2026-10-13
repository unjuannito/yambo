export const AVATAR_BACKGROUNDS = [
    "#dfe7fb", "#d9f2e4", "#e7defa", "#fdeccf", "#fbdada", "#e3f4d1",
    "#f9e0f0", "#d8ecfb", "#fff3b8", "#d3f4f1", "#ffe0cc", "#e9e9ee",
];
export const AVATAR_CLOTHES = [
    "tee-star", "jacket", "dots", "tee-swirl", "stripes",
    "hoodie", "tee-heart", "overalls", "scarf", "tee-y",
] as const;
export const AVATAR_EYES = ["dots", "sleepy", "glasses", "happy", "wink", "sunglasses", "lashes", "stars"] as const;
export const AVATAR_TOPS = [
    "none", "tuft", "beanie", "flower", "curls",
    "cap", "crown", "bow", "party", "headphones", "mohawk",
] as const;
export const AVATAR_EXTRAS = ["none", "blush", "freckles", "earring"] as const;

/** El elefante de una persona. Coincide con lo que guarda el backend (StaffAvatar). */
export interface ElephantAvatarConfig {
    /** Índice en AVATAR_BACKGROUNDS. */
    background: number;
    clothes: (typeof AVATAR_CLOTHES)[number];
    eyes: (typeof AVATAR_EYES)[number];
    top: (typeof AVATAR_TOPS)[number];
    extra: (typeof AVATAR_EXTRAS)[number];
    trunkUp: boolean;
    flip: boolean;
}

interface ElephantAvatarProps {
    /** Cualquier valor estable de la persona (su id): la misma semilla da siempre el mismo elefante. */
    seed: string;
    /** Elefante personalizado; si falta, se usa el que sale de la semilla. */
    config?: ElephantAvatarConfig | null;
    className?: string;
    title?: string;
}

const INK = "#111111";
const PAPER = "#ffffff";

function hash(seed: string): number {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/** El elefante que le toca a una semilla cuando la persona no ha personalizado el suyo. */
export function avatarFromSeed(seed: string): ElephantAvatarConfig {
    const h = hash(seed);
    return {
        background: h % AVATAR_BACKGROUNDS.length,
        clothes: AVATAR_CLOTHES[(h >>> 3) % AVATAR_CLOTHES.length],
        eyes: AVATAR_EYES[(h >>> 6) % AVATAR_EYES.length],
        top: AVATAR_TOPS[(h >>> 9) % AVATAR_TOPS.length],
        extra: AVATAR_EXTRAS[(h >>> 14) % AVATAR_EXTRAS.length],
        trunkUp: ((h >>> 12) & 1) === 1,
        flip: ((h >>> 13) & 1) === 1,
    };
}

/**
 * Avatar genérico para quien no muestra su foto: un elefante de Yambo dibujado a línea,
 * en blanco y negro sobre un fondo pastel. Cada persona puede personalizar el suyo; si no lo
 * ha hecho, fondo, ropa, ojos, trompa y peinado salen de la semilla, así que no cambia entre
 * visitas (ni entre servidor y navegador).
 */
export default function ElephantAvatar({ seed, config, className, title }: ElephantAvatarProps) {
    const { background, clothes, eyes, top, extra, trunkUp, flip } = config ?? avatarFromSeed(seed);
    const bg = AVATAR_BACKGROUNDS[background] ?? AVATAR_BACKGROUNDS[0];

    const line = { fill: PAPER, stroke: INK, strokeWidth: 4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
    const pen = { fill: "none", stroke: INK, strokeWidth: 3.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
    const chalk = { fill: "none", stroke: PAPER, strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
    const trunk = trunkUp
        ? "M100 120 C100 158 118 176 138 166 C152 158 150 140 140 138"
        : "M100 120 C100 152 96 170 108 180 C118 188 130 182 128 172";
    // Se alarga por debajo del lienzo para que llegue al borde también en el recorte vertical de la ficha
    const body = "M24 340 L24 244 C24 204 58 184 100 184 C142 184 176 204 176 244 L176 340 Z";

    return (
        <svg
            viewBox="0 0 200 240"
            preserveAspectRatio="xMidYMid slice"
            className={className}
            role="img"
            aria-label={title ?? "Elefante de Yambo"}
        >
            <rect width="200" height="240" fill={bg} />

            {/* Algo más pequeño que el lienzo para que orejas y peinado no se corten al recortar la tarjeta */}
            <g transform={`translate(100 112) scale(${flip ? -0.78 : 0.78} 0.78) translate(-100 -122)`}>
                {/* Ropa */}
                <path d={body} {...line} fill={clothes.startsWith("tee") ? INK : PAPER} />
                {clothes === "tee-heart" && (
                    <path d="M100 236 c-24 -16 -20 -34 -9 -34 c5 0 9 4 9 9 c0 -5 4 -9 9 -9 c11 0 15 18 -9 34 Z" {...chalk} />
                )}
                {clothes === "tee-y" && (
                    <path d="M86 204 L100 222 L114 204 M100 222 V242" {...chalk} strokeWidth={5} />
                )}
                {clothes === "hoodie" && (
                    <path d="M72 190 q28 24 56 0 M90 202 v24 M110 202 v24 M66 244 q34 -16 68 0" {...pen} />
                )}
                {clothes === "overalls" && (
                    <g>
                        <path d="M76 204 H124 V340 H76 Z" fill={INK} />
                        <path d="M78 206 L62 190 M122 206 L138 190" {...pen} strokeWidth={7} />
                        <circle cx="82" cy="210" r="3.5" fill={PAPER} />
                        <circle cx="118" cy="210" r="3.5" fill={PAPER} />
                    </g>
                )}
                {clothes === "scarf" && (
                    <g fill={INK} stroke={INK} strokeWidth="3" strokeLinejoin="round">
                        <path d="M60 190 q40 22 80 0 l4 14 q-44 24 -88 0 Z" />
                        <path d="M116 206 l12 36 l-17 3 l-8 -34 Z" />
                    </g>
                )}
                {clothes === "tee-star" && (
                    <path d="M100 204 l5 11 12 1 -9 8 3 12 -11 -6 -11 6 3 -12 -9 -8 12 -1 Z" {...chalk} />
                )}
                {clothes === "tee-swirl" && (
                    <path d="M100 220 c6 -2 10 4 6 9 c-6 7 -20 2 -18 -9 c2 -12 22 -15 30 -3 c7 11 -2 24 -16 25" {...chalk} />
                )}
                {clothes === "jacket" && (
                    <g>
                        <path d="M84 186 L84 340 L116 340 L116 186 Z" fill={INK} />
                        <path d="M84 186 C74 198 72 220 74 244 L74 340 M116 186 C126 198 128 220 126 244 L126 340" {...pen} />
                    </g>
                )}
                {clothes === "dots" && (
                    <g fill={INK}>
                        {[[58, 214], [82, 204], [108, 212], [134, 204], [152, 222], [70, 234], [96, 232], [124, 230], [46, 252], [84, 256], [112, 250], [142, 244], [160, 262], [62, 274], [100, 276], [136, 270]].map(([x, y]) => (
                            <circle key={`${x}-${y}`} cx={x} cy={y} r="4.5" />
                        ))}
                    </g>
                )}
                {clothes === "stripes" && (
                    <path d="M50 206 H150 M38 220 H162 M32 234 H168 M30 248 H170 M30 262 H170 M30 276 H170" {...pen} strokeWidth={5} />
                )}

                {/* Orejas */}
                <ellipse cx="40" cy="104" rx="36" ry="46" {...line} />
                <ellipse cx="160" cy="104" rx="36" ry="46" {...line} />
                <path d="M34 78 C22 96 24 122 40 134 M166 78 C178 96 176 122 160 134" {...pen} />

                {/* Cabeza */}
                <ellipse cx="100" cy="106" rx="50" ry="52" {...line} />

                {/* Detalle */}
                {extra === "blush" && (
                    <path d="M60 122 l5 -7 M67 124 l5 -7 M74 126 l5 -7 M121 126 l5 -7 M128 124 l5 -7 M135 122 l5 -7" {...pen} strokeWidth={2.5} />
                )}
                {extra === "freckles" && (
                    <g fill={INK}>
                        {[[64, 118], [72, 124], [62, 128], [136, 118], [128, 124], [138, 128]].map(([x, y]) => (
                            <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" />
                        ))}
                    </g>
                )}
                {extra === "earring" && <circle cx="24" cy="142" r="6" {...pen} />}

                {/* Colmillos */}
                <path d="M80 142 q-4 14 6 20 q4 -8 2 -18 Z M120 142 q4 14 -6 20 q-4 -8 -2 -18 Z" {...line} strokeWidth={3} />

                {/* Trompa: trazo negro grueso con uno blanco encima para dejar solo el contorno */}
                <path d={trunk} fill="none" stroke={INK} strokeWidth="30" strokeLinecap="round" />
                <path d={trunk} fill="none" stroke={PAPER} strokeWidth="22" strokeLinecap="round" />
                <path
                    d={trunkUp ? "M94 142 q6 4 12 0 M98 156 q6 5 13 2" : "M92 140 q8 4 16 0 M92 154 q8 4 16 0"}
                    {...pen}
                    strokeWidth={2.5}
                />

                {/* Ojos */}
                {eyes === "dots" && (
                    <g fill={INK}>
                        <circle cx="80" cy="100" r="5" />
                        <circle cx="120" cy="100" r="5" />
                    </g>
                )}
                {eyes === "sleepy" && (
                    <path d="M70 98 H88 M112 98 H130 M74 104 h8 M116 104 h8 M70 88 l14 -3 M116 85 l14 3" {...pen} />
                )}
                {eyes === "happy" && (
                    <path d="M71 102 q9 -11 18 0 M111 102 q9 -11 18 0" {...pen} />
                )}
                {eyes === "wink" && (
                    <g>
                        <circle cx="80" cy="100" r="5" fill={INK} />
                        <path d="M111 102 q9 -11 18 0" {...pen} />
                    </g>
                )}
                {eyes === "lashes" && (
                    <g>
                        <circle cx="80" cy="101" r="5" fill={INK} />
                        <circle cx="120" cy="101" r="5" fill={INK} />
                        <path d="M72 93 l-4 -5 M80 91 v-7 M88 93 l4 -5 M112 93 l-4 -5 M120 91 v-7 M128 93 l4 -5" {...pen} strokeWidth={2.5} />
                    </g>
                )}
                {eyes === "stars" && (
                    <g fill={INK}>
                        <path d="M80 90 l3 7 7 1 -5 5 1 7 -6 -4 -6 4 1 -7 -5 -5 7 -1 Z" />
                        <path d="M120 90 l3 7 7 1 -5 5 1 7 -6 -4 -6 4 1 -7 -5 -5 7 -1 Z" />
                    </g>
                )}
                {eyes === "sunglasses" && (
                    <g>
                        <rect x="64" y="90" width="32" height="20" rx="9" fill={INK} />
                        <rect x="104" y="90" width="32" height="20" rx="9" fill={INK} />
                        <path d="M94 97 H106 M54 94 L64 97 M146 94 L136 97" {...pen} />
                        <path d="M71 97 l6 -3 M111 97 l6 -3" {...chalk} strokeWidth={2.5} />
                    </g>
                )}
                {eyes === "glasses" && (
                    <g>
                        <circle cx="80" cy="100" r="14" {...line} strokeWidth={3.5} />
                        <circle cx="120" cy="100" r="14" {...line} strokeWidth={3.5} />
                        <path d="M94 100 H106" {...pen} />
                        <circle cx="80" cy="100" r="4" fill={INK} />
                        <circle cx="120" cy="100" r="4" fill={INK} />
                    </g>
                )}

                {/* Peinado o complemento */}
                {top === "tuft" && (
                    <path d="M84 58 C82 40 96 34 100 46 C102 32 118 36 116 52 C124 46 130 56 122 62 C110 54 96 54 84 58 Z" fill={INK} />
                )}
                {top === "curls" && (
                    <g fill={INK}>
                        <circle cx="78" cy="60" r="11" />
                        <circle cx="94" cy="52" r="12" />
                        <circle cx="111" cy="52" r="12" />
                        <circle cx="126" cy="61" r="10" />
                    </g>
                )}
                {top === "beanie" && (
                    <g>
                        <path d="M56 82 C56 40 144 40 144 82 Z" fill={INK} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
                        <path d="M54 82 H146" stroke={PAPER} strokeWidth="3" strokeLinecap="round" />
                        <circle cx="100" cy="46" r="8" {...line} strokeWidth={3} />
                    </g>
                )}
                {top === "cap" && (
                    <g fill={INK} stroke={INK} strokeWidth="4" strokeLinejoin="round">
                        <path d="M58 78 C60 42 140 42 142 78 Z" />
                        <path d="M138 76 q30 -2 36 12 q-20 4 -38 -4 Z" />
                    </g>
                )}
                {top === "crown" && (
                    <path d="M70 64 L64 34 L84 50 L100 28 L116 50 L136 34 L130 64 Z" {...line} />
                )}
                {top === "bow" && (
                    <g fill={INK} stroke={INK} strokeWidth="3" strokeLinejoin="round">
                        <path d="M124 56 L150 42 L150 72 Z M124 56 L98 42 L98 72 Z" />
                        <circle cx="124" cy="56" r="7" fill={PAPER} />
                    </g>
                )}
                {top === "party" && (
                    <g>
                        <path d="M100 12 L126 62 L74 62 Z" {...line} />
                        <path d="M88 38 H112 M81 51 H119" {...pen} />
                        <circle cx="100" cy="12" r="7" fill={INK} />
                    </g>
                )}
                {top === "mohawk" && (
                    <path d="M82 62 L86 36 L95 54 L100 28 L106 54 L114 36 L118 62 Z" fill={INK} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
                )}
                {top === "headphones" && (
                    <g>
                        <path d="M46 100 C42 34 158 34 154 100" {...pen} strokeWidth={7} />
                        <rect x="34" y="88" width="20" height="38" rx="9" fill={INK} />
                        <rect x="146" y="88" width="20" height="38" rx="9" fill={INK} />
                    </g>
                )}
                {top === "flower" && (
                    <g>
                        {[0, 72, 144, 216, 288].map((a) => (
                            <circle key={a} cx="66" cy="50" r="8" {...line} strokeWidth={3} transform={`rotate(${a} 66 62)`} />
                        ))}
                        <circle cx="66" cy="62" r="5" fill={INK} />
                    </g>
                )}
            </g>
        </svg>
    );
}
