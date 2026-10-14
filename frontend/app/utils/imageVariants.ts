/**
 * Versiones redimensionadas (WebP) de las imágenes subidas. El backend las genera la
 * primera vez que se piden: `/uploads/foto.jpg` → `/uploads/_w/480/foto.jpg`.
 * Debe coincidir con `ImageVariantService.WIDTHS`.
 */
export const VARIANT_WIDTHS = [160, 320, 480, 800, 1200, 1600] as const;

export type VariantWidth = (typeof VARIANT_WIDTHS)[number];

// Admite el prefijo `/api` y URLs absolutas; solo ficheros directamente bajo /uploads/
const UPLOAD_URL = /^(.*\/uploads\/)([^/?#]+\.(?:jpe?g|png|webp))$/i;

/** URL de la variante, o `null` si no es una imagen subida que se pueda redimensionar (SVG, GIF, externa). */
export function variantUrl(src: string | null | undefined, width: VariantWidth): string | null {
    const match = src?.match(UPLOAD_URL);
    return match ? `${match[1]}_w/${width}/${match[2]}` : null;
}

/**
 * `srcset` con las variantes hasta `maxWidth`: lo máximo que la imagen llega a ocupar
 * en pantalla (contando pantallas de doble densidad), para no ofrecer tamaños inútiles.
 */
export function variantSrcSet(src: string | null | undefined, maxWidth: VariantWidth = 1600): string | undefined {
    const entries = VARIANT_WIDTHS.filter((width) => width <= maxWidth)
        .map((width) => {
            const url = variantUrl(src, width);
            return url ? `${url} ${width}w` : null;
        })
        .filter(Boolean);
    return entries.length > 0 ? entries.join(", ") : undefined;
}
