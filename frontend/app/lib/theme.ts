/**
 * Apariencia configurable (issue #125).
 *
 * Mecanismo: Yambo define toda su paleta/tipografía/esquinas en el bloque
 * `@theme` de Tailwind v4 (variables `--color-yambo-*`, `--font-display`,
 * `--radius-*`). Las utilidades generadas (bg-yambo-green-500, font-display,
 * rounded-*) referencian esas variables, así que redefinirlas en runtime
 * recolorea/retematiza toda la app —web pública, panel y 404— sin tocar ningún
 * componente. Cuando no hay apariencia guardada no se aplica nada y la app
 * queda exactamente igual que hoy.
 *
 * Dos vías:
 *  - Colores / radios / tipografía / ángulo → variables CSS inline sobre <html>
 *    (inline gana a :root y hereda a toda la app).
 *  - Conmutadores booleanos (degradados, animaciones) → atributos data-* en
 *    <html> que reaccionan reglas en app.css.
 *
 * La apariencia se guarda en la BD como un simple objeto plano de
 * strings (settings con categoría "appearance"); ver appearanceToPlain /
 * appearanceFromPlain.
 */

export type RadiusStyle = "playful" | "soft" | "square";
export type FontStyle = "jakarta" | "inter" | "system" | "serif";

export interface Appearance {
    /** Color de marca principal (verde por defecto). Hex. */
    primaryColor: string;
    /** Color de acento (morado por defecto). Hex. */
    accentColor: string;
    /** Color de fondo general (blanco por defecto). Hex. */
    bgColor: string;
    /** Color de texto general (gris oscuro por defecto). Hex. */
    textColor: string;
    /** Esquinas: playful / soft / square. */
    radius: RadiusStyle;
    /** Tipografía de titulares. */
    font: FontStyle;
    /** Degradados en botones/hero. "on" | "off". */
    gradients: "on" | "off";
    /** Ángulo (grados) de los degradados de marca. */
    gradientAngle: number;
    /** Animaciones de entrada/éxito. "on" | "off". */
    motion: "on" | "off";
    /** URL de logo personalizada (opcional). */
    logo?: string;
    /** URL de portada/hero personalizada (opcional). */
    cover?: string;
}

/** Valores por defecto = los del bloque `@theme` de app.css. */
export const DEFAULT_APPEARANCE: Appearance = {
    primaryColor: "#33a35e",
    accentColor: "#906bac",
    bgColor: "#ffffff",
    textColor: "#2a2a2a",
    radius: "playful",
    font: "jakarta",
    gradients: "on",
    gradientAngle: 135,
    motion: "on",
};

/** Paletas de partida: un clic aplica color principal/acento/fondo/texto. */
export interface PalettePreset {
    id: string;
    name: string;
    swatches: [string, string];
    values: Pick<Appearance, "primaryColor" | "accentColor" | "bgColor" | "textColor">;
}

export const PALETTES: PalettePreset[] = [
    {
        id: "yambo",
        name: "Yambo",
        swatches: ["#33a35e", "#906bac"],
        values: {
            primaryColor: "#33a35e",
            accentColor: "#906bac",
            bgColor: "#ffffff",
            textColor: "#2a2a2a",
        },
    },
    {
        id: "coral",
        name: "Coral",
        swatches: ["#ff6b6b", "#ffa07a"],
        values: {
            primaryColor: "#ff6b6b",
            accentColor: "#ffa07a",
            bgColor: "#fff8f6",
            textColor: "#3a2b2b",
        },
    },
    {
        id: "oceano",
        name: "Océano",
        swatches: ["#0e9594", "#4ecdc4"],
        values: {
            primaryColor: "#0e9594",
            accentColor: "#4ecdc4",
            bgColor: "#f3fbfb",
            textColor: "#1f2e2e",
        },
    },
    {
        id: "dorado",
        name: "Dorado",
        swatches: ["#c79a2e", "#ffd93d"],
        values: {
            primaryColor: "#c79a2e",
            accentColor: "#ffd93d",
            bgColor: "#fffdf6",
            textColor: "#33302a",
        },
    },
    {
        id: "oscuro",
        name: "Oscuro",
        swatches: ["#3b82f6", "#a78bfa"],
        values: {
            primaryColor: "#3b82f6",
            accentColor: "#a78bfa",
            bgColor: "#0f172a",
            textColor: "#e5e7eb",
        },
    },
];

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function clampHex(value: unknown, fallback: string): string {
    const v = typeof value === "string" ? value.trim() : "";
    return HEX_RE.test(v) ? v.toLowerCase() : fallback;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
    return typeof value === "string" && (allowed as readonly string[]).includes(value)
        ? (value as T)
        : fallback;
}

function clampAngle(value: unknown, fallback: number): number {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.round(Math.max(0, Math.min(360, n)));
}

/** Normaliza una carga cruda (BD/JSON) a un Appearance válido y seguro. */
export function normalizeAppearance(raw: Record<string, unknown> | null | undefined): Appearance {
    if (!raw) return { ...DEFAULT_APPEARANCE };
    return {
        primaryColor: clampHex(raw.primaryColor, DEFAULT_APPEARANCE.primaryColor),
        accentColor: clampHex(raw.accentColor, DEFAULT_APPEARANCE.accentColor),
        bgColor: clampHex(raw.bgColor, DEFAULT_APPEARANCE.bgColor),
        textColor: clampHex(raw.textColor, DEFAULT_APPEARANCE.textColor),
        radius: oneOf(raw.radius, ["playful", "soft", "square"] as const, "playful"),
        font: oneOf(raw.font, ["jakarta", "inter", "system", "serif"] as const, "jakarta"),
        gradients: oneOf(raw.gradients, ["on", "off"] as const, "on"),
        gradientAngle: clampAngle(raw.gradientAngle, DEFAULT_APPEARANCE.gradientAngle),
        motion: oneOf(raw.motion, ["on", "off"] as const, "on"),
        logo: typeof raw.logo === "string" && raw.logo.trim() ? raw.logo.trim() : undefined,
        cover: typeof raw.cover === "string" && raw.cover.trim() ? raw.cover.trim() : undefined,
    };
}

/** Serializa a objeto plano de strings (para guardar en settings). */
export function appearanceToPlain(a: Appearance): Record<string, string> {
    return {
        primaryColor: a.primaryColor,
        accentColor: a.accentColor,
        bgColor: a.bgColor,
        textColor: a.textColor,
        radius: a.radius,
        font: a.font,
        gradients: a.gradients,
        gradientAngle: String(a.gradientAngle),
        motion: a.motion,
        logo: a.logo ?? "",
        cover: a.cover ?? "",
    };
}

/** Rehidrata desde el objeto plano guardado (equivale a normalizeAppearance). */
export function appearanceFromPlain(raw: Record<string, string> | null | undefined): Appearance {
    return normalizeAppearance(raw);
}

/** ¿Difiere de los valores por defecto? */
export function isCustomAppearance(a: Appearance): boolean {
    return (
        a.primaryColor !== DEFAULT_APPEARANCE.primaryColor ||
        a.accentColor !== DEFAULT_APPEARANCE.accentColor ||
        a.bgColor !== DEFAULT_APPEARANCE.bgColor ||
        a.textColor !== DEFAULT_APPEARANCE.textColor ||
        a.radius !== DEFAULT_APPEARANCE.radius ||
        a.font !== DEFAULT_APPEARANCE.font ||
        a.gradients !== DEFAULT_APPEARANCE.gradients ||
        a.gradientAngle !== DEFAULT_APPEARANCE.gradientAngle ||
        a.motion !== DEFAULT_APPEARANCE.motion ||
        Boolean(a.logo) ||
        Boolean(a.cover)
    );
}

const RADIUS_PRESETS: Record<RadiusStyle, Record<string, string>> = {
    playful: {
        "--radius-sm": "0.375rem", "--radius-md": "0.5rem", "--radius-lg": "0.75rem",
        "--radius-xl": "1rem", "--radius-2xl": "1rem", "--radius-3xl": "1.5rem",
        "--radius-playful": "1rem", "--radius-pill": "9999px", "--radius-blob": "2rem",
    },
    soft: {
        "--radius-sm": "0.25rem", "--radius-md": "0.375rem", "--radius-lg": "0.5rem",
        "--radius-xl": "0.5rem", "--radius-2xl": "0.625rem", "--radius-3xl": "0.875rem",
        "--radius-playful": "0.75rem", "--radius-pill": "9999px", "--radius-blob": "1.5rem",
    },
    square: {
        "--radius-sm": "0.125rem", "--radius-md": "0.125rem", "--radius-lg": "0.25rem",
        "--radius-xl": "0.25rem", "--radius-2xl": "0.375rem", "--radius-3xl": "0.5rem",
        "--radius-playful": "0.375rem", "--radius-pill": "0.5rem", "--radius-blob": "0.75rem",
    },
};

const FONT_PRESETS: Record<FontStyle, Record<string, string>> = {
    jakarta: { "--font-display": '"Plus Jakarta Sans", "Inter", ui-sans-serif, system-ui, sans-serif' },
    inter: {
        "--font-sans": '"Inter", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
        "--font-display": '"Inter", ui-sans-serif, system-ui, sans-serif',
    },
    system: { "--font-display": 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
    serif: { "--font-display": 'Georgia, Cambria, "Times New Roman", serif' },
};

function colorScale(base: string, prefix: string): Record<string, string> {
    return {
        [`${prefix}-50`]: `color-mix(in srgb, ${base} 9%, white)`,
        [`${prefix}-100`]: `color-mix(in srgb, ${base} 22%, white)`,
        [`${prefix}-200`]: `color-mix(in srgb, ${base} 40%, white)`,
        [`${prefix}-300`]: `color-mix(in srgb, ${base} 60%, white)`,
        [`${prefix}-400`]: `color-mix(in srgb, ${base} 82%, white)`,
        [`${prefix}-500`]: base,
        [`${prefix}-600`]: `color-mix(in srgb, ${base} 85%, black)`,
        [`${prefix}-700`]: `color-mix(in srgb, ${base} 68%, black)`,
        [`${prefix}-800`]: `color-mix(in srgb, ${base} 50%, black)`,
        [`${prefix}-900`]: `color-mix(in srgb, ${base} 33%, black)`,
    };
}

function cssVars(a: Appearance): Record<string, string> {
    return {
        "--brand": a.primaryColor,
        "--accent": a.accentColor,
        "--ink": a.textColor,
        "--paper": a.bgColor,
        ...colorScale(a.primaryColor, "--color-yambo-green"),
        ...colorScale(a.accentColor, "--color-yambo-purple"),
        "--grad-angle": `${a.gradientAngle}deg`,
        ...RADIUS_PRESETS[a.radius],
        ...FONT_PRESETS[a.font],
    };
}

/** Variables CSS (texto) para inyectar inline. "" si la apariencia es default. */
export function buildInlineVars(a: Appearance): string {
    if (!isCustomAppearance(a)) return "";
    return Object.entries(cssVars(a)).map(([k, v]) => `${k}:${v}`).join(";");
}

/** Atributos data-* que las reglas de app.css usan como selectors. */
export function themeDataAttrs(a: Appearance): Record<string, string> {
    return {
        "data-radius": a.radius,
        "data-font": a.font,
        "data-gradients": a.gradients,
        "data-motion": a.motion,
    };
}

/**
 * Aplica la apariencia a un elemento (normalmente <html>): fija los data-* y
 * las variables CSS inline. Para el preview en vivo del panel se puede pasar
 * cualquier contenedor: al ser inline, el preview se retematiza de forma
 * independiente del resto de la página.
 */
export function applyThemeToElement(el: HTMLElement, a: Appearance): void {
    for (const [k, v] of Object.entries(themeDataAttrs(a))) el.setAttribute(k, v);
    const css = buildInlineVars(a);
    if (css) {
        el.style.cssText = css;
    } else {
        el.removeAttribute("style");
    }
}

/** Atributo `style` completo (para SSR en root.tsx). "" si es default. */
export function themeStyleAttr(a: Appearance): string {
    return buildInlineVars(a);
}

/** Atributos `data-*` como texto (para SSR en root.tsx). */
export function themeDataAttrString(a: Appearance): string {
    return Object.entries(themeDataAttrs(a)).map(([k, v]) => `${k}="${v}"`).join(" ");
}

/** Objeto de estilo (variables CSS) para el atributo style de SSR. Vacío si default. */
export function themeStyleObject(a: Appearance): Record<string, string> {
    if (!isCustomAppearance(a)) return {};
    return cssVars(a);
}
