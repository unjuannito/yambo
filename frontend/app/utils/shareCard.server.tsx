/**
 * Imágenes para compartir enlaces (Open Graph): tarjetas de 1200×630 con la foto, el
 * título y los datos clave, para que la vista previa de WhatsApp, Telegram o las redes
 * diga algo por sí sola. Se dibujan con satori (JSX → SVG) y resvg (SVG → píxeles), y se
 * sirven en JPEG: en PNG una tarjeta con foto pasa de 1 MB y WhatsApp no la enseña.
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import jpeg from "jpeg-js";
import logoSvg from "../../public/logo.svg?raw";
import { MAX_PEOPLE, type ShareCard } from "./shareCards";

export const SHARE_CARD_WIDTH = 1200;
export const SHARE_CARD_HEIGHT = 630;

const BRAND_GREEN = "#32a45e";
const BRAND_PURPLE = "#956bbd";
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || "http://localhost:8080/api";

const require = createRequire(import.meta.url);

let fonts: Parameters<typeof satori>[1]["fonts"] | null = null;

/** satori necesita las fuentes en TTF/OTF/WOFF (no WOFF2); se leen una vez. */
function loadFonts() {
    if (!fonts) {
        const file = (path: string) => readFileSync(require.resolve(path));
        fonts = [
            { name: "Plus Jakarta Sans", weight: 800, style: "normal", data: file("@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-800-normal.woff") },
            { name: "Inter", weight: 500, style: "normal", data: file("@fontsource/inter/files/inter-latin-500-normal.woff") },
            { name: "Inter", weight: 600, style: "normal", data: file("@fontsource/inter/files/inter-latin-600-normal.woff") },
        ];
    }
    return fonts;
}

// resvg no aplica las clases del <style> del logo: se pasan los colores como atributos
const LOGO_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(
    logoSvg
        .replace(/class="cls-1"/g, `fill="${BRAND_PURPLE}"`)
        .replace(/class="cls-2"/g, `fill="${BRAND_GREEN}"`),
).toString("base64")}`;

const UPLOAD_NAME = /\/uploads\/([^/?#]+\.(?:jpe?g|png|webp))$/i;

interface Photo {
    src: string;
    /** Ancho entre alto. */
    aspect: number;
    data: Buffer;
}

/** Zona con contenido de un logo, en fracciones de la imagen (0–1). */
interface Trim {
    left: number;
    top: number;
    width: number;
    height: number;
}

/**
 * Los logos suelen venir con mucho margen vacío alrededor (y el backend lo deja en blanco):
 * se busca el rectángulo que tiene dibujo para enseñar solo eso. `null` si no hay nada que quitar.
 */
export function trimWhitespace(data: Buffer): Trim | null {
    let image: { width: number; height: number; data: Uint8Array };
    try {
        image = jpeg.decode(data, { useTArray: true, maxMemoryUsageInMB: 64 });
    } catch {
        return null;
    }
    const { width, height, data: pixels } = image;
    const isBlank = (x: number, y: number) => {
        const i = (y * width + x) * 4;
        return pixels[i] > 240 && pixels[i + 1] > 240 && pixels[i + 2] > 240;
    };
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (isBlank(x, y)) continue;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }
    if (maxX < 0) return null;
    // Un poco de aire alrededor del dibujo
    const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.04);
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(width - 1, maxX + pad);
    maxY = Math.min(height - 1, maxY + pad);
    const trim = { left: minX / width, top: minY / height, width: (maxX - minX + 1) / width, height: (maxY - minY + 1) / height };
    return trim.width > 0.95 && trim.height > 0.95 ? null : trim;
}

/** Proporción de un JPEG o PNG leyendo su cabecera, sin decodificarlo. */
export function imageAspect(data: Buffer): number | null {
    if (data.subarray(1, 4).toString("latin1") === "PNG") {
        return data.readUInt32BE(16) / data.readUInt32BE(20);
    }
    if (data[0] !== 0xff || data[1] !== 0xd8) return null;
    // JPEG: se recorren los segmentos hasta el SOF, que lleva alto y ancho
    let i = 2;
    while (i + 9 < data.length && data[i] === 0xff) {
        const marker = data[i + 1];
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
            return data.readUInt16BE(i + 7) / data.readUInt16BE(i + 5);
        }
        i += 2 + data.readUInt16BE(i + 2);
    }
    return null;
}

/**
 * La imagen en JPEG de como mucho 1200×630, sin recortar (`/uploads/_og/...`, la genera el
 * backend). `null` si no es una subida, no existe o el backend no ha podido convertirla:
 * satori solo entiende JPEG y PNG, y una foto rota no debe impedir que haya tarjeta.
 */
async function loadPhoto(image: string | null | undefined): Promise<Photo | null> {
    const name = image?.match(UPLOAD_NAME)?.[1];
    if (!name) return null;
    try {
        const res = await fetch(`${BACKEND_URL}/uploads/_og/${name}`, { signal: AbortSignal.timeout(10_000) });
        const type = res.headers.get("content-type")?.split(";")[0];
        if (!res.ok || (type !== "image/jpeg" && type !== "image/png")) return null;
        const data = Buffer.from(await res.arrayBuffer());
        const aspect = imageAspect(data);
        if (!aspect) return null;
        return { src: `data:${type};base64,${data.toString("base64")}`, aspect, data };
    } catch {
        return null;
    }
}

/** Solo colores `#rrggbb`: el valor acaba dentro del SVG. */
function safeColor(color: string | null | undefined): string {
    return color && /^#[0-9a-f]{6}$/i.test(color) ? color : BRAND_GREEN;
}

const BADGE_COLORS = { positive: BRAND_GREEN, negative: "#dc2626", neutral: "#475569" } as const;

/**
 * Solo las fotos de proporción parecida a la tarjeta van a sangre con el texto encima;
 * carteles verticales y logos alargados se recortarían o quedarían tapados por el texto.
 */
const FULL_BLEED_ASPECT = { min: 1.25, max: 2.3 };
/** Ancho máximo de la columna de la imagen cuando no va a sangre. */
const SIDE_IMAGE_MAX_WIDTH = 520;

/** Hueco del recuadro blanco donde va un logo alargado (los banners de los proyectos). */
const LOGO_BOX = { width: 420, height: 150 };

type Layout =
    | { kind: "plain" }
    | { kind: "full"; photo: Photo }
    | { kind: "side"; photo: Photo; width: number }
    | { kind: "logo"; photo: Photo; trim: Trim | null };

function chooseLayout(photo: Photo | null): Layout {
    if (!photo) return { kind: "plain" };
    if (photo.aspect >= FULL_BLEED_ASPECT.min && photo.aspect <= FULL_BLEED_ASPECT.max) return { kind: "full", photo };
    // Más ancha que la tarjeta: es un logo o un banner, que en columna quedaría diminuto
    if (photo.aspect > FULL_BLEED_ASPECT.max) return { kind: "logo", photo, trim: trimWhitespace(photo.data) };
    return { kind: "side", photo, width: Math.min(Math.round(SHARE_CARD_HEIGHT * photo.aspect), SIDE_IMAGE_MAX_WIDTH) };
}

/**
 * El logo en un recuadro blanco, del mayor tamaño que quepa en {@link LOGO_BOX}. Si tiene
 * margen vacío, la imagen entera se desplaza dentro de una ventana que solo deja ver el dibujo.
 */
function LogoBox({ photo, trim }: { photo: Photo; trim: Trim | null }) {
    const area = trim ?? { left: 0, top: 0, width: 1, height: 1 };
    const aspect = photo.aspect * (area.width / area.height);
    const width = Math.round(Math.min(LOGO_BOX.width, LOGO_BOX.height * aspect));
    const height = Math.round(width / aspect);
    const fullWidth = width / area.width;
    const fullHeight = height / area.height;
    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#ffffff", borderRadius: 24, padding: "18px 26px", boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", position: "relative", width, height, overflow: "hidden" }}>
                <img
                    src={photo.src}
                    width={fullWidth}
                    height={fullHeight}
                    style={{ position: "absolute", left: -area.left * fullWidth, top: -area.top * fullHeight }}
                />
            </div>
        </div>
    );
}

function brandBackground(accent: string) {
    // Un degradado del color del proyecto, que se oscurece hacia la esquina
    return { backgroundColor: accent, backgroundImage: `linear-gradient(135deg, ${accent} 0%, ${accent} 45%, #1f2937 140%)` };
}

/** Círculos decorativos para que el fondo liso no parezca vacío. */
function Decoration() {
    return (
        <div style={{ display: "flex", position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
            <div style={{ position: "absolute", right: -140, top: -160, width: 520, height: 520, borderRadius: 9999, backgroundColor: "rgba(255,255,255,0.10)" }} />
            <div style={{ position: "absolute", right: 160, bottom: -220, width: 420, height: 420, borderRadius: 9999, backgroundColor: "rgba(255,255,255,0.07)" }} />
        </div>
    );
}

const FACE_SIZE = 104;

/** Fila de caras que se solapan, con «+N» si hay más de las que caben. */
function Faces({ faces, total, accent }: { faces: Photo[]; total: number; accent: string }) {
    const circle = { display: "flex", width: FACE_SIZE, height: FACE_SIZE, borderRadius: 9999, border: "5px solid #ffffff", marginRight: -22, overflow: "hidden" } as const;
    return (
        <div style={{ display: "flex", marginBottom: 28 }}>
            {faces.map((face, i) => (
                <div key={i} style={{ ...circle, backgroundColor: "#ffffff" }}>
                    <img src={face.src} width={FACE_SIZE - 10} height={FACE_SIZE - 10} style={{ objectFit: "cover", objectPosition: "center 25%" }} />
                </div>
            ))}
            {total > faces.length && (
                <div style={{ ...circle, alignItems: "center", justifyContent: "center", backgroundColor: "#1f2937", color: "#ffffff", fontWeight: 600, fontSize: 32, borderColor: accent }}>
                    +{total - faces.length}
                </div>
            )}
        </div>
    );
}

/** Logo, etiqueta, título y datos: lo mismo en todos los diseños, cambia el ancho disponible. */
interface TextProps {
    card: ShareCard;
    accent: string;
    width: number;
    onPhoto: boolean;
    faces?: Photo[];
    /** Lo que va arriba a la derecha en lugar de la etiqueta de estado, que pasa junto a la otra. */
    corner?: React.ReactNode;
}

function Text({ card, accent, width, onPhoto, faces = [], corner }: TextProps) {
    const details = (card.details ?? []).filter((d): d is string => !!d);
    const narrow = width < 1000;
    const titleSize = card.title.length > 60 ? (narrow ? 46 : 54) : card.title.length > 32 ? (narrow ? 54 : 64) : (narrow ? 64 : 76);
    // Con la fila de caras no caben dos líneas de título grande
    const fittedTitleSize = faces.length > 0 && card.title.length > 24 ? Math.min(titleSize, 62) : titleSize;
    const textWidth = width - 120;
    const badge = card.badge && (
        <div style={{ display: "flex", backgroundColor: BADGE_COLORS[card.badge.tone], color: "#ffffff", fontWeight: 600, fontSize: 28, borderRadius: 9999, padding: "12px 28px", boxShadow: "0 6px 18px rgba(0,0,0,0.18)" }}>
            {card.badge.label}
        </div>
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", width, height: "100%", padding: "48px 60px 56px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", backgroundColor: "#ffffff", borderRadius: 24, padding: "14px 22px", boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
                    <img src={LOGO_DATA_URI} width={170} height={95} />
                </div>
                {corner ?? badge}
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
                {faces.length > 0 && <Faces faces={faces} total={card.people?.length ?? faces.length} accent={accent} />}
                {(card.eyebrow || (corner && badge)) && (
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
                        {card.eyebrow && (
                            <div style={{ display: "flex", backgroundColor: onPhoto ? accent : "rgba(255,255,255,0.18)", fontWeight: 600, fontSize: 26, borderRadius: 12, padding: "8px 18px", marginRight: 16, textTransform: "uppercase", letterSpacing: 1.5 }}>
                                {card.eyebrow}
                            </div>
                        )}
                        {corner && badge}
                    </div>
                )}
                <div style={{ display: "block", fontFamily: "Plus Jakarta Sans", fontWeight: 800, fontSize: fittedTitleSize, lineHeight: 1.08, letterSpacing: -1, lineClamp: narrow ? 3 : 2, maxWidth: textWidth }}>
                    {card.title}
                </div>
                {details.length > 0 && (
                    // En columna estrecha cada dato en su línea; a lo ancho, en una sola
                    <div style={{ display: "flex", flexDirection: narrow ? "column" : "row", marginTop: 24, fontWeight: 500, fontSize: narrow ? 30 : 32, opacity: 0.92, maxWidth: textWidth }}>
                        {narrow
                            ? details.map((d) => <div key={d} style={{ display: "block", lineClamp: 1, marginTop: 4 }}>{d}</div>)
                            : <div style={{ display: "block", lineClamp: 1 }}>{details.join("  ·  ")}</div>}
                    </div>
                )}
            </div>
        </div>
    );
}

function CardContent({ card, layout, accent, faces }: { card: ShareCard; layout: Layout; accent: string; faces: Photo[] }) {
    const root = { display: "flex", position: "relative", width: "100%", height: "100%", fontFamily: "Inter", color: "#ffffff" } as const;

    if (layout.kind === "full") {
        return (
            <div style={{ ...root, backgroundColor: "#111827" }}>
                <img src={layout.photo.src} width={SHARE_CARD_WIDTH} height={SHARE_CARD_HEIGHT} style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }} />
                {/* Velo oscuro abajo para que el texto se lea sobre cualquier foto */}
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        bottom: 0,
                        width: "100%",
                        height: "75%",
                        backgroundImage: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.85) 100%)",
                    }}
                />
                <Text card={card} accent={accent} width={SHARE_CARD_WIDTH} onPhoto faces={faces} />
            </div>
        );
    }

    if (layout.kind === "side") {
        const textWidth = SHARE_CARD_WIDTH - layout.width;
        return (
            <div style={root}>
                <div style={{ ...root, width: textWidth, ...brandBackground(accent) }}>
                    <Decoration />
                    <Text card={card} accent={accent} width={textWidth} onPhoto={false} faces={faces} />
                </div>
                {/* La imagen entera, sin recortar: los carteles llevan texto que debe leerse */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: layout.width, height: "100%", backgroundColor: "#ffffff" }}>
                    <img src={layout.photo.src} width={layout.width} height={Math.min(SHARE_CARD_HEIGHT, Math.round(layout.width / layout.photo.aspect))} style={{ objectFit: "contain" }} />
                </div>
            </div>
        );
    }

    return (
        <div style={{ ...root, ...brandBackground(accent) }}>
            <Decoration />
            <Text
                card={card}
                accent={accent}
                width={SHARE_CARD_WIDTH}
                onPhoto={false}
                faces={faces}
                corner={layout.kind === "logo" ? <LogoBox photo={layout.photo} trim={layout.trim} /> : undefined}
            />
        </div>
    );
}

const JPEG_QUALITY = 85;

export async function renderShareCard(card: ShareCard): Promise<Buffer> {
    const [photo, ...people] = await Promise.all([loadPhoto(card.image), ...(card.people ?? []).slice(0, MAX_PEOPLE).map(loadPhoto)]);
    const faces = people.filter((face): face is Photo => face !== null);
    const svg = await satori(<CardContent card={card} layout={chooseLayout(photo)} accent={safeColor(card.accent)} faces={faces} />, {
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
        fonts: loadFonts(),
    });
    const image = new Resvg(svg, { fitTo: { mode: "width", value: SHARE_CARD_WIDTH }, background: "#ffffff" }).render();
    return jpeg.encode({ data: image.pixels, width: image.width, height: image.height }, JPEG_QUALITY).data;
}

/** Respuesta HTTP con la tarjeta; las redes la guardan en caché, así que una hora basta. */
export async function shareCardResponse(card: ShareCard): Promise<Response> {
    const image = await renderShareCard(card);
    return new Response(new Uint8Array(image), {
        headers: {
            "Content-Type": "image/jpeg",
            "Content-Length": String(image.length),
            "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
    });
}
