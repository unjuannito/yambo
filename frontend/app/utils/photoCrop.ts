/**
 * Encuadre de la foto de perfil: cómo se coloca la foto original dentro de un marco retrato 5:6.
 *
 * Todo se calcula en "unidades de marco" (el marco mide FRAME.width × FRAME.height), para que
 * sirva igual en el editor, en las vistas previas y al generar el recorte final.
 */

export interface PhotoEdit {
    /** Desplazamiento del centro en el eje horizontal de la foto, de -1 a 1 de lo que puede moverse. */
    x: number;
    /** Desplazamiento del centro en el eje vertical de la foto, de -1 a 1 de lo que puede moverse. */
    y: number;
    /** 1 = la foto cubre el marco justo; hasta MAX_ZOOM. */
    zoom: number;
    /** Grados, en el sentido de las agujas del reloj, de -180 a 180. */
    rotation: number;
}

export const FRAME = { width: 5, height: 6 };
export const MAX_ZOOM = 4;
export const DEFAULT_EDIT: PhotoEdit = { x: 0, y: 0, zoom: 1, rotation: 0 };

/** Tamaño del recorte que se sube. */
export const OUTPUT = { width: 800, height: 960 };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function normalizeEdit(edit: Partial<PhotoEdit> | null | undefined): PhotoEdit {
    const finite = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);
    let rotation = finite(edit?.rotation, 0) % 360;
    if (rotation > 180) rotation -= 360;
    if (rotation <= -180) rotation += 360;
    return {
        x: clamp(finite(edit?.x, 0), -1, 1),
        y: clamp(finite(edit?.y, 0), -1, 1),
        zoom: clamp(finite(edit?.zoom, 1), 1, MAX_ZOOM),
        rotation,
    };
}

interface Layout {
    /** Unidades de marco por píxel de la foto. */
    scale: number;
    /** Cuánto puede moverse el centro en cada eje de la foto sin dejar huecos en el marco. */
    maxU: number;
    maxV: number;
    cos: number;
    sin: number;
}

function layout(imageWidth: number, imageHeight: number, edit: PhotoEdit): Layout {
    const radians = (edit.rotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    // Lo que ocupa el marco medido sobre los ejes de la foto girada
    const spanU = FRAME.width * Math.abs(cos) + FRAME.height * Math.abs(sin);
    const spanV = FRAME.width * Math.abs(sin) + FRAME.height * Math.abs(cos);
    // Escala mínima para que la foto girada cubra el marco entero
    const cover = Math.max(spanU / imageWidth, spanV / imageHeight);
    const scale = cover * edit.zoom;
    return {
        scale,
        maxU: Math.max(0, (imageWidth * scale - spanU) / 2),
        maxV: Math.max(0, (imageHeight * scale - spanV) / 2),
        cos,
        sin,
    };
}

export interface Placement {
    /** Tamaño de la foto ya escalada, en unidades de marco. */
    width: number;
    height: number;
    /** Desplazamiento del centro de la foto respecto al centro del marco, en unidades de marco. */
    offsetX: number;
    offsetY: number;
    rotation: number;
}

/** Dónde y con qué tamaño se dibuja la foto para un encuadre. */
export function placement(imageWidth: number, imageHeight: number, rawEdit: PhotoEdit): Placement {
    const edit = normalizeEdit(rawEdit);
    const { scale, maxU, maxV, cos, sin } = layout(imageWidth, imageHeight, edit);
    const u = edit.x * maxU;
    const v = edit.y * maxV;
    return {
        width: imageWidth * scale,
        height: imageHeight * scale,
        // Del eje de la foto al del marco (rotación)
        offsetX: u * cos - v * sin,
        offsetY: u * sin + v * cos,
        rotation: edit.rotation,
    };
}

/**
 * Mueve la foto (dx, dy) en unidades de marco, como al arrastrarla, sin dejar que asome el fondo.
 */
export function pan(imageWidth: number, imageHeight: number, rawEdit: PhotoEdit, dx: number, dy: number): PhotoEdit {
    const edit = normalizeEdit(rawEdit);
    const { maxU, maxV, cos, sin } = layout(imageWidth, imageHeight, edit);
    // Del eje del marco al de la foto (rotación inversa)
    const du = dx * cos + dy * sin;
    const dv = -dx * sin + dy * cos;
    const u = clamp(edit.x * maxU + du, -maxU, maxU);
    const v = clamp(edit.y * maxV + dv, -maxV, maxV);
    return { ...edit, x: maxU > 0 ? u / maxU : 0, y: maxV > 0 ? v / maxV : 0 };
}

/**
 * Cambia el zoom dejando quieto el punto (px, py) del marco, en unidades de marco desde su centro:
 * lo que hay bajo el cursor o entre los dedos sigue ahí. Si no cabe, se ajusta sin dejar huecos.
 */
export function zoomAt(imageWidth: number, imageHeight: number, rawEdit: PhotoEdit, zoom: number, px: number, py: number): PhotoEdit {
    const edit = normalizeEdit(rawEdit);
    const before = layout(imageWidth, imageHeight, edit);
    const next = normalizeEdit({ ...edit, zoom });
    const after = layout(imageWidth, imageHeight, next);
    const ratio = after.scale / before.scale;
    const place = placement(imageWidth, imageHeight, edit);
    // El centro de la foto se aleja o se acerca al punto fijo en la misma proporción
    const ox = px + (place.offsetX - px) * ratio;
    const oy = py + (place.offsetY - py) * ratio;
    // Del eje del marco al de la foto (rotación inversa)
    const u = clamp(ox * after.cos + oy * after.sin, -after.maxU, after.maxU);
    const v = clamp(-ox * after.sin + oy * after.cos, -after.maxV, after.maxV);
    return { ...next, x: after.maxU > 0 ? u / after.maxU : 0, y: after.maxV > 0 ? v / after.maxV : 0 };
}

/** Cambia el zoom manteniendo el centro donde estaba en la medida de lo posible. */
export function zoomTo(imageWidth: number, imageHeight: number, rawEdit: PhotoEdit, zoom: number): PhotoEdit {
    return zoomAt(imageWidth, imageHeight, rawEdit, zoom, 0, 0);
}

export function rotateTo(rawEdit: PhotoEdit, rotation: number): PhotoEdit {
    return normalizeEdit({ ...rawEdit, rotation });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo generar la imagen"))), "image/jpeg", quality);
    });
}

/** Genera el recorte final (JPEG 800×960) de una foto ya cargada con su encuadre. */
export async function renderCrop(image: HTMLImageElement, edit: PhotoEdit): Promise<Blob> {
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT.width;
    canvas.height = OUTPUT.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo generar la imagen");

    const unit = OUTPUT.width / FRAME.width;
    const place = placement(image.naturalWidth, image.naturalHeight, edit);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingQuality = "high";
    ctx.translate(canvas.width / 2 + place.offsetX * unit, canvas.height / 2 + place.offsetY * unit);
    ctx.rotate((place.rotation * Math.PI) / 180);
    ctx.drawImage(image, (-place.width * unit) / 2, (-place.height * unit) / 2, place.width * unit, place.height * unit);
    return canvasToBlob(canvas, 0.9);
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("No se pudo leer la imagen"));
        image.src = src;
    });
}

/**
 * Reduce una foto recién elegida para que su lado mayor no pase de maxSide.
 * Las fotos de móvil suelen superar el límite de subida; para encuadrar no hace falta más.
 */
export async function downscaleImage(file: File, maxSide = 2000): Promise<File> {
    const url = URL.createObjectURL(file);
    try {
        const image = await loadImage(url);
        const largest = Math.max(image.naturalWidth, image.naturalHeight);
        if (largest <= maxSide) return file;

        const ratio = maxSide / largest;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.naturalWidth * ratio);
        canvas.height = Math.round(image.naturalHeight * ratio);
        const ctx = canvas.getContext("2d");
        if (!ctx) return file;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const blob = await canvasToBlob(canvas, 0.9);
        return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
    } finally {
        URL.revokeObjectURL(url);
    }
}
