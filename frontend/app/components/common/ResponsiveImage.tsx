import type { ImgHTMLAttributes } from "react";
import { variantSrcSet, type VariantWidth } from "~/utils/imageVariants";

interface ResponsiveImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "sizes" | "loading"> {
    src: string;
    alt: string;
    /** Ancho que ocupa la imagen en pantalla, como en el atributo `sizes` de HTML. */
    sizes: string;
    /** Variante más grande que tiene sentido ofrecer (ancho en pantalla × 2 para pantallas retina). */
    maxWidth?: VariantWidth;
    /** Imagen principal de la página: se carga cuanto antes en vez de esperar al scroll. */
    priority?: boolean;
}

/**
 * `<img>` que deja al navegador elegir el tamaño justo de una imagen subida (WebP
 * redimensionado). Para cualquier otra URL se comporta como un `<img>` normal.
 */
export function ResponsiveImage({ src, alt, sizes, maxWidth, priority = false, ...rest }: ResponsiveImageProps) {
    const srcSet = variantSrcSet(src, maxWidth);
    return (
        <img
            // El original queda de reserva para los navegadores sin `srcset`
            src={src}
            srcSet={srcSet}
            sizes={srcSet ? sizes : undefined}
            alt={alt}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
            {...rest}
        />
    );
}
