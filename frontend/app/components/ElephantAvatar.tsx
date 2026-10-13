// ═════════════════════════════ Opciones ═════════════════════════════

export const AVATAR_BACKGROUNDS = [
    "#dfe7fb", "#d9f2e4", "#e7defa", "#fdeccf", "#fbdada", "#e3f4d1",
    "#f9e0f0", "#d8ecfb", "#fff3b8", "#d3f4f1", "#ffe0cc", "#e9e9ee",
];
export const AVATAR_CLOTHES = [
    "tee-star", "jacket", "dots", "tee-swirl", "stripes",
    "hoodie", "tee-heart", "overalls", "scarf", "tee-y",
] as const;
export const AVATAR_EYES = ["dots", "sleepy", "glasses", "happy", "wink", "sunglasses", "lashes", "stars"] as const;
export const AVATAR_HAIR = [
    "none", "tuft", "curls", "afro", "bun", "fringe",
    "spiky", "wavy", "pigtails", "long", "mohawk", "buzz",
] as const;
export const AVATAR_TOPS = ["none", "beanie", "cap", "crown", "bow", "party", "headphones", "flower"] as const;
export const AVATAR_EXTRAS = ["none", "blush", "freckles", "earring"] as const;

export type AvatarClothes = (typeof AVATAR_CLOTHES)[number];
export type AvatarEyes = (typeof AVATAR_EYES)[number];
export type AvatarHair = (typeof AVATAR_HAIR)[number];
export type AvatarTop = (typeof AVATAR_TOPS)[number];
export type AvatarExtra = (typeof AVATAR_EXTRAS)[number];

/** El elefante de una persona. Coincide con lo que guarda el backend (StaffAvatar). */
export interface ElephantAvatarConfig {
    /** Índice en AVATAR_BACKGROUNDS. */
    background: number;
    clothes: AvatarClothes;
    eyes: AvatarEyes;
    hair: AvatarHair;
    top: AvatarTop;
    extra: AvatarExtra;
    trunkUp: boolean;
    flip: boolean;
}

/** Gorros que tapan la cabeza: con ellos solo asoma el pelo que cae por los lados o por la frente. */
export const COVERING_TOPS: readonly AvatarTop[] = ["beanie", "cap"];
const HAIR_UNDER_HATS: readonly AvatarHair[] = ["fringe", "long", "pigtails"];

export function hairHiddenBy(top: AvatarTop, hair: AvatarHair): boolean {
    return COVERING_TOPS.includes(top) && !HAIR_UNDER_HATS.includes(hair);
}

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
    const top = AVATAR_TOPS[(h >>> 9) % AVATAR_TOPS.length];
    let hair = AVATAR_HAIR[(h >>> 16) % AVATAR_HAIR.length];
    // Que no salga por defecto un pelo que el gorro tapa entero
    if (hairHiddenBy(top, hair)) hair = "fringe";
    return {
        background: h % AVATAR_BACKGROUNDS.length,
        clothes: AVATAR_CLOTHES[(h >>> 3) % AVATAR_CLOTHES.length],
        eyes: AVATAR_EYES[(h >>> 6) % AVATAR_EYES.length],
        hair,
        top,
        extra: AVATAR_EXTRAS[(h >>> 14) % AVATAR_EXTRAS.length],
        trunkUp: ((h >>> 12) & 1) === 1,
        flip: ((h >>> 13) & 1) === 1,
    };
}

function pick<T extends string>(list: readonly T[], value: unknown): T | undefined {
    return (list as readonly unknown[]).includes(value) ? (value as T) : undefined;
}

/**
 * Convierte lo que llegue del backend en una configuración válida: rellena lo que falte o no
 * se reconozca con lo de la semilla y migra los avatares antiguos, que guardaban el pelo
 * (tuft, curls, mohawk) en "top".
 */
export function normalizeAvatar(
    raw: Partial<Record<keyof ElephantAvatarConfig, unknown>> | null | undefined,
    seed: string,
): ElephantAvatarConfig {
    const base = avatarFromSeed(seed);
    if (!raw) return base;

    const legacyHair = raw.top !== "none" ? pick(AVATAR_HAIR, raw.top) : undefined;
    const background =
        typeof raw.background === "number" &&
        Number.isInteger(raw.background) &&
        raw.background >= 0 &&
        raw.background < AVATAR_BACKGROUNDS.length
            ? raw.background
            : base.background;

    return {
        background,
        clothes: pick(AVATAR_CLOTHES, raw.clothes) ?? base.clothes,
        eyes: pick(AVATAR_EYES, raw.eyes) ?? base.eyes,
        // Un avatar guardado sin pelo se respeta: no se le inventa uno
        hair: pick(AVATAR_HAIR, raw.hair) ?? legacyHair ?? "none",
        top: legacyHair ? "none" : (pick(AVATAR_TOPS, raw.top) ?? "none"),
        extra: pick(AVATAR_EXTRAS, raw.extra) ?? base.extra,
        trunkUp: typeof raw.trunkUp === "boolean" ? raw.trunkUp : base.trunkUp,
        flip: typeof raw.flip === "boolean" ? raw.flip : base.flip,
    };
}

const CONFIG_KEYS: (keyof ElephantAvatarConfig)[] = ["background", "clothes", "eyes", "hair", "top", "extra", "trunkUp", "flip"];

export function sameAvatar(a: ElephantAvatarConfig, b: ElephantAvatarConfig): boolean {
    return CONFIG_KEYS.every((k) => a[k] === b[k]);
}

// ═════════════════════════════ Dibujo ═════════════════════════════

const INK = "#111111";
const PAPER = "#ffffff";

const line = { fill: PAPER, stroke: INK, strokeWidth: 4, strokeLinejoin: "round", strokeLinecap: "round" } as const;
const pen = { fill: "none", stroke: INK, strokeWidth: 3.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const chalk = { fill: "none", stroke: PAPER, strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" } as const;

// Cabeza: elipse centrada en (100, 106), de 50 × 52
const HEAD = { cx: 100, cy: 106, rx: 50, ry: 52 };
// La trompa cuelga del centro de la cara, por delante de la cabeza y de la ropa
const TRUNK_DOWN = "M100 110 C100 136 99 156 104 170 C109 182 124 182 128 170";
const TRUNK_UP = "M100 110 C100 150 112 172 132 170 C150 168 160 150 158 132";
// Se alarga por debajo del lienzo para que llegue al borde también en el recorte vertical de la ficha
const BODY = "M24 340 L24 244 C24 204 58 184 100 184 C142 184 176 204 176 244 L176 340 Z";
// Casquete de pelo liso que tapa la coronilla (moño y coletas)
const HAIR_CAP = "M58 84 C56 36 144 36 142 84 C126 66 74 66 58 84 Z";

// Pelo rapado: puntitos repartidos por la coronilla, dentro del contorno de la cabeza
const BUZZ_DOTS: [number, number][] = (() => {
    const dots: [number, number][] = [];
    [60, 67, 74, 81].forEach((y, row) => {
        for (let x = 60 + (row % 2) * 4; x <= 140; x += 8) {
            const dx = (x - HEAD.cx) / HEAD.rx;
            const dy = (y - HEAD.cy) / HEAD.ry;
            if (dx * dx + dy * dy < 0.8) dots.push([x, y]);
        }
    });
    return dots;
})();

function Clothes({ clothes }: { clothes: AvatarClothes }) {
    const dark = clothes.startsWith("tee");
    const seams = "M48 222 C50 234 50 246 48 262 M152 222 C150 234 150 246 152 262";
    const hasOwnCollar = clothes === "hoodie" || clothes === "scarf" || clothes === "jacket";

    return (
        <g>
            <path d={BODY} {...line} fill={dark ? INK : PAPER} />
            <path d={seams} {...(dark ? chalk : pen)} strokeWidth={3} />
            {!hasOwnCollar && <path d="M80 190 C90 201 110 201 120 190" {...(dark ? chalk : pen)} />}

            {clothes === "tee-heart" && (
                <path d="M100 240 c-24 -16 -20 -34 -9 -34 c5 0 9 4 9 9 c0 -5 4 -9 9 -9 c11 0 15 18 -9 34 Z" {...chalk} />
            )}
            {clothes === "tee-y" && <path d="M86 210 L100 228 L114 210 M100 228 V248" {...chalk} strokeWidth={5} />}
            {clothes === "tee-star" && (
                <path d="M100 208 l5 11 12 1 -9 8 3 12 -11 -6 -11 6 3 -12 -9 -8 12 -1 Z" {...chalk} />
            )}
            {clothes === "tee-swirl" && (
                <path d="M100 224 c6 -2 10 4 6 9 c-6 7 -20 2 -18 -9 c2 -12 22 -15 30 -3 c7 11 -2 24 -16 25" {...chalk} />
            )}
            {clothes === "hoodie" && (
                <g>
                    <path d="M70 188 C76 178 124 178 130 188 C130 206 70 206 70 188 Z" {...line} strokeWidth={3.5} />
                    <path d="M82 190 C92 198 108 198 118 190" {...pen} strokeWidth={3} />
                    <path d="M95 202 c-3 8 3 12 -1 22 M105 202 c3 8 -3 12 1 22" {...pen} strokeWidth={2.5} />
                    <path d="M66 250 q34 -16 68 0" {...pen} strokeWidth={3} />
                </g>
            )}
            {clothes === "overalls" && (
                <g>
                    <path d="M74 214 H126 V340 H74 Z" fill={INK} />
                    <path d="M78 216 L62 194 M122 216 L138 194" {...pen} strokeWidth={7} />
                    <circle cx="82" cy="220" r="3.5" fill={PAPER} />
                    <circle cx="118" cy="220" r="3.5" fill={PAPER} />
                </g>
            )}
            {clothes === "scarf" && (
                <g fill={INK} stroke={INK} strokeWidth="3" strokeLinejoin="round">
                    <path d="M62 186 q38 22 76 0 l4 14 q-42 26 -84 0 Z" />
                    <path d="M114 204 l12 38 l-17 3 l-8 -36 Z" />
                    <path d="M112 226 l14 -3 M115 238 l13 -3" stroke={PAPER} strokeWidth="2" fill="none" />
                </g>
            )}
            {clothes === "jacket" && (
                <g>
                    <path d="M84 188 L84 340 L116 340 L116 188 Z" fill={INK} />
                    <path d="M84 188 C74 200 72 222 74 246 L74 340 M116 188 C126 200 128 222 126 246 L126 340" {...pen} />
                    <path d="M100 196 V340" stroke={PAPER} strokeWidth="2" strokeDasharray="1 7" strokeLinecap="round" />
                </g>
            )}
            {clothes === "dots" && (
                <g fill={INK}>
                    {[[56, 216], [76, 210], [124, 210], [144, 216], [66, 232], [90, 222], [110, 222], [134, 232], [46, 250], [84, 248], [116, 248], [154, 250], [64, 268], [100, 266], [136, 268]].map(([x, y]) => (
                        <circle key={`${x}-${y}`} cx={x} cy={y} r="4.5" />
                    ))}
                </g>
            )}
            {clothes === "stripes" && (
                <path d="M46 210 H154 M36 224 H164 M30 238 H170 M28 252 H172 M28 266 H172 M28 280 H172" {...pen} strokeWidth={5} />
            )}
        </g>
    );
}

function Hair({ hair }: { hair: AvatarHair }) {
    switch (hair) {
        case "tuft":
            return (
                <path d="M84 58 C82 40 96 34 100 46 C102 32 118 36 116 52 C124 46 130 56 122 62 C110 54 96 54 84 58 Z" fill={INK} />
            );
        case "curls":
            return (
                <g fill={INK}>
                    {[[76, 64, 10], [88, 52, 12], [104, 48, 12], [119, 52, 11], [130, 63, 10], [97, 60, 8], [113, 62, 8]].map(([x, y, r]) => (
                        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
                    ))}
                </g>
            );
        case "afro":
            return (
                <g fill={INK}>
                    {[[62, 74, 13], [66, 54, 14], [80, 40, 15], [100, 34, 16], [120, 40, 15], [134, 54, 14], [138, 74, 13], [84, 58, 14], [100, 52, 14], [116, 58, 14]].map(([x, y, r]) => (
                        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
                    ))}
                    <path d="M88 32 q6 -6 14 -5" {...chalk} strokeWidth={2.5} />
                </g>
            );
        case "bun":
            return (
                <g>
                    <path d={HAIR_CAP} fill={INK} />
                    <circle cx="100" cy="32" r="14" fill={INK} />
                    <path d="M88 44 Q100 50 112 44" {...chalk} />
                    <path d="M93 26 q4 -4 9 -3" {...chalk} strokeWidth={2.5} />
                </g>
            );
        case "fringe":
            return (
                <path
                    d="M52 94 C48 36 152 36 148 94 L138 78 L128 90 L116 76 L104 90 L92 76 L80 90 L70 78 L60 92 Z"
                    fill={INK}
                    stroke={INK}
                    strokeWidth="2"
                    strokeLinejoin="round"
                />
            );
        case "spiky":
            return (
                <path
                    d="M58 82 L54 50 L72 62 L74 30 L90 52 L100 20 L110 52 L126 30 L128 62 L146 50 L142 82 C124 68 76 68 58 82 Z"
                    fill={INK}
                    stroke={INK}
                    strokeWidth="2"
                    strokeLinejoin="round"
                />
            );
        case "wavy":
            return (
                <g>
                    <path
                        d="M54 88 C50 46 80 34 104 38 C132 42 152 62 148 90 C140 74 128 70 120 78 C114 66 100 62 92 72 C82 62 64 66 54 88 Z"
                        fill={INK}
                    />
                    <path d="M76 50 q14 -8 30 -4" {...chalk} strokeWidth={2.5} />
                </g>
            );
        case "pigtails":
            return (
                <g>
                    <path d={HAIR_CAP} fill={INK} />
                    <circle cx="54" cy="56" r="13" fill={INK} />
                    <circle cx="146" cy="56" r="13" fill={INK} />
                    <circle cx="65" cy="65" r="4.5" {...line} strokeWidth={2.5} />
                    <circle cx="135" cy="65" r="4.5" {...line} strokeWidth={2.5} />
                </g>
            );
        case "long":
            return (
                <path
                    d="M100 50 C68 50 50 70 50 100 L48 152 C56 156 64 150 66 142 L66 98 C70 80 84 68 100 66 C116 68 130 80 134 98 L134 142 C136 150 144 156 152 152 L150 100 C150 70 132 50 100 50 Z"
                    fill={INK}
                />
            );
        case "mohawk":
            return (
                <path
                    d="M82 62 L86 36 L95 54 L100 28 L106 54 L114 36 L118 62 C106 58 94 58 82 62 Z"
                    fill={INK}
                    stroke={INK}
                    strokeWidth="3"
                    strokeLinejoin="round"
                />
            );
        case "buzz":
            return (
                <g fill={INK}>
                    {BUZZ_DOTS.map(([x, y]) => (
                        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" />
                    ))}
                </g>
            );
        default:
            return null;
    }
}

function Eyes({ eyes }: { eyes: AvatarEyes }) {
    switch (eyes) {
        case "dots":
            return (
                <g>
                    <circle cx="80" cy="100" r="5.5" fill={INK} />
                    <circle cx="120" cy="100" r="5.5" fill={INK} />
                    <circle cx="82" cy="98" r="1.6" fill={PAPER} />
                    <circle cx="122" cy="98" r="1.6" fill={PAPER} />
                </g>
            );
        case "sleepy":
            return <path d="M70 100 q9 6 18 0 M112 100 q9 6 18 0 M72 90 l12 -2 M116 88 l12 2" {...pen} />;
        case "happy":
            return <path d="M71 102 q9 -11 18 0 M111 102 q9 -11 18 0" {...pen} />;
        case "wink":
            return (
                <g>
                    <circle cx="80" cy="100" r="5.5" fill={INK} />
                    <circle cx="82" cy="98" r="1.6" fill={PAPER} />
                    <path d="M111 102 q9 -11 18 0" {...pen} />
                </g>
            );
        case "lashes":
            return (
                <g>
                    <circle cx="80" cy="101" r="5.5" fill={INK} />
                    <circle cx="120" cy="101" r="5.5" fill={INK} />
                    <path d="M72 93 l-4 -5 M80 91 v-7 M88 93 l4 -5 M112 93 l-4 -5 M120 91 v-7 M128 93 l4 -5" {...pen} strokeWidth={2.5} />
                </g>
            );
        case "stars":
            return (
                <g fill={INK} stroke={INK} strokeWidth="1.5" strokeLinejoin="round">
                    <path d="M80 90 l3 7 7 1 -5 5 1 7 -6 -4 -6 4 1 -7 -5 -5 7 -1 Z" />
                    <path d="M120 90 l3 7 7 1 -5 5 1 7 -6 -4 -6 4 1 -7 -5 -5 7 -1 Z" />
                </g>
            );
        case "sunglasses":
            return (
                <g>
                    <path d="M94 97 H106 M54 94 L64 97 M146 94 L136 97" {...pen} />
                    <rect x="64" y="90" width="32" height="20" rx="9" fill={INK} />
                    <rect x="104" y="90" width="32" height="20" rx="9" fill={INK} />
                    <path d="M71 97 l6 -3 M111 97 l6 -3" {...chalk} strokeWidth={2.5} />
                </g>
            );
        case "glasses":
            return (
                <g>
                    <path d="M94 100 H106 M54 96 L66 99 M146 96 L134 99" {...pen} />
                    <circle cx="80" cy="100" r="14" {...line} strokeWidth={3.5} />
                    <circle cx="120" cy="100" r="14" {...line} strokeWidth={3.5} />
                    <circle cx="80" cy="100" r="4.5" fill={INK} />
                    <circle cx="120" cy="100" r="4.5" fill={INK} />
                </g>
            );
        default:
            return null;
    }
}

function Top({ top }: { top: AvatarTop }) {
    switch (top) {
        case "beanie":
            return (
                <g>
                    <path d="M54 84 C52 34 148 34 146 84 Z" fill={INK} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
                    <path d="M50 76 Q100 66 150 76 L150 90 Q100 80 50 90 Z" {...line} strokeWidth={3.5} />
                    <path d="M62 80 v8 M76 77 v8 M90 75 v8 M104 75 v8 M118 76 v8 M132 77 v8" {...pen} strokeWidth={2} />
                    <circle cx="100" cy="38" r="9" {...line} strokeWidth={3} />
                </g>
            );
        case "cap":
            return (
                <g>
                    <path d="M54 80 C56 36 144 36 146 80 Q100 68 54 80 Z" {...line} />
                    {/* Visera vista de frente: una media luna que no llega a tapar los ojos */}
                    <path d="M50 78 Q100 64 150 78 Q158 82 152 88 Q100 76 48 88 Q42 82 50 78 Z" {...line} strokeWidth={3.5} />
                    <path d="M100 45 V72" {...pen} strokeWidth={2} />
                    <circle cx="100" cy="44" r="3" fill={INK} />
                </g>
            );
        case "crown":
            return (
                <g>
                    <path d="M68 64 L62 32 L82 48 L100 24 L118 48 L138 32 L132 64 Z" {...line} />
                    <circle cx="100" cy="52" r="4" fill={INK} />
                    <circle cx="80" cy="56" r="3" fill={INK} />
                    <circle cx="120" cy="56" r="3" fill={INK} />
                </g>
            );
        case "bow":
            return (
                <g fill={INK} stroke={INK} strokeWidth="3" strokeLinejoin="round">
                    <path d="M124 56 L150 42 L150 72 Z M124 56 L98 42 L98 72 Z" />
                    <circle cx="124" cy="56" r="7" fill={PAPER} />
                </g>
            );
        case "party":
            return (
                <g>
                    <path d="M100 10 L126 60 L74 60 Z" {...line} />
                    <path d="M88 36 H112 M81 49 H119" {...pen} />
                    <circle cx="100" cy="10" r="7" fill={INK} />
                </g>
            );
        case "headphones":
            return (
                <g>
                    <path d="M44 102 C40 30 160 30 156 102" {...pen} strokeWidth={8} />
                    <path d="M44 102 C40 30 160 30 156 102" {...chalk} strokeWidth={2} />
                    <rect x="30" y="86" width="22" height="40" rx="10" fill={INK} />
                    <rect x="148" y="86" width="22" height="40" rx="10" fill={INK} />
                </g>
            );
        case "flower":
            return (
                <g>
                    {[0, 72, 144, 216, 288].map((a) => (
                        <circle key={a} cx="66" cy="50" r="8" {...line} strokeWidth={3} transform={`rotate(${a} 66 62)`} />
                    ))}
                    <circle cx="66" cy="62" r="5.5" fill={INK} />
                </g>
            );
        default:
            return null;
    }
}

interface ElephantAvatarProps {
    /** Cualquier valor estable de la persona (su id): la misma semilla da siempre el mismo elefante. */
    seed: string;
    /** Elefante personalizado (tal cual llega del backend); si falta, se usa el de la semilla. */
    config?: Partial<ElephantAvatarConfig> | null;
    className?: string;
    title?: string;
}

/**
 * Avatar genérico para quien no muestra su foto: un elefante de Yambo dibujado a línea,
 * en blanco y negro sobre un fondo pastel. Cada persona puede personalizar el suyo; si no lo
 * ha hecho, todo sale de la semilla, así que no cambia entre visitas (ni entre servidor y navegador).
 */
export function ElephantAvatar({ seed, config, className, title }: ElephantAvatarProps) {
    const { background, clothes, eyes, hair, top, extra, trunkUp, flip } = normalizeAvatar(config, seed);
    const trunk = trunkUp ? TRUNK_UP : TRUNK_DOWN;
    const visibleHair: AvatarHair = hairHiddenBy(top, hair) ? "none" : hair;

    return (
        <svg
            viewBox="0 0 200 240"
            preserveAspectRatio="xMidYMid slice"
            width="100%"
            height="100%"
            className={className}
            role="img"
            aria-label={title ?? "Elefante de Yambo"}
        >
            <rect width="200" height="240" fill={AVATAR_BACKGROUNDS[background]} />

            {/* Algo más pequeño que el lienzo para que orejas y peinado no se corten al recortar la tarjeta */}
            <g transform={`translate(100 112) scale(${flip ? -0.78 : 0.78} 0.78) translate(-100 -122)`}>
                {/* Orejas: detrás de la cabeza, que tapa su arranque */}
                <path d="M62 76 C38 58 8 70 6 104 C4 136 26 158 50 150 C58 148 62 140 64 132 Z" {...line} />
                <path d="M138 76 C162 58 192 70 194 104 C196 136 174 158 150 150 C142 148 138 140 136 132 Z" {...line} />
                <path d="M48 84 C26 86 22 120 38 136 M152 84 C174 86 178 120 162 136" {...pen} strokeWidth={3} />
                {extra === "earring" && <circle cx="36" cy="158" r="6" {...pen} strokeWidth={3} />}

                {/* Cuello: une la cabeza con el cuerpo */}
                <path d="M84 150 L82 194 L118 194 L116 150 Z" {...line} />
                <Clothes clothes={clothes} />

                {/* Cabeza */}
                <ellipse {...HEAD} {...line} />

                {/* Mejillas */}
                {extra === "blush" && (
                    <path d="M58 118 l5 -7 M65 120 l5 -7 M72 122 l5 -7 M123 122 l5 -7 M130 120 l5 -7 M137 118 l5 -7" {...pen} strokeWidth={2.5} />
                )}
                {extra === "freckles" && (
                    <g fill={INK}>
                        {[[62, 114], [70, 119], [62, 123], [138, 114], [130, 119], [138, 123]].map(([x, y]) => (
                            <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" />
                        ))}
                    </g>
                )}

                {/* Sonrisa: asoma a los dos lados de la trompa */}
                <path d="M70 128 Q76 137 84 136 M116 136 Q124 137 130 128" {...pen} />

                {/* Colmillos: pequeños, a cada lado del arranque de la trompa */}
                <path d="M84 138 C77 147 75 158 78 167 C86 162 90 151 90 140 Z M116 138 C123 147 125 158 122 167 C114 162 110 151 110 140 Z" {...line} strokeWidth={3} />

                {/* Trompa: contorno negro y relleno blanco encima; el arranque se funde con la cara */}
                <path d={trunk} fill="none" stroke={INK} strokeWidth={22} strokeLinecap="round" />
                <path d={trunk} fill="none" stroke={PAPER} strokeWidth={14} strokeLinecap="round" />
                <ellipse cx="100" cy="106" rx="7" ry="10" fill={PAPER} />
                <path d="M94 132 q6 3 12 0 M94 146 q6 3 12 0" {...pen} strokeWidth={2.5} />
                <path d={trunkUp ? "M152 136 q6 -1 11 2" : "M122 174 q5 3 10 0"} {...pen} strokeWidth={2.5} />

                <Hair hair={visibleHair} />
                <Eyes eyes={eyes} />
                <Top top={top} />
            </g>
        </svg>
    );
}

export default ElephantAvatar;
