#!/usr/bin/env bash
# Regenera los iconos y la imagen de compartir a partir de frontend/public/logo.svg.
# Requiere ImageMagick (`convert`). Ejecutar tras cambiar el logo y commitear el resultado.
set -euo pipefail

PUBLIC_DIR="$(cd "$(dirname "$0")/../frontend/public" && pwd)"
LOGO="$PUBLIC_DIR/logo.svg"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

BACKGROUND="#ffffff"

# El renderizador SVG de ImageMagick no entiende el <style> del logo y pinta trazos negros:
# se le pasa una copia con los colores como atributos.
inline_styles() {
    sed -e 's/class="cls-1"/fill="#956bbd" stroke="none"/g' \
        -e 's/class="cls-2"/fill="#32a45e" stroke="none"/g'
}

# El logo sin la línea «Asociación» (el primer <g>), que a tamaño de icono no se lee.
mark_only() {
    awk '/<g>/ { n++ } n != 1 { print } /<\/g>/ && n == 1 { n++ }'
}

inline_styles < "$LOGO" > "$TMP/logo.svg"
mark_only < "$LOGO" | sed 's/viewBox="[^"]*"/viewBox="0 0 539.37 252"/' > "$TMP/mark-classes.svg"
inline_styles < "$TMP/mark-classes.svg" > "$TMP/mark.svg"

convert -background none -density 400 "$TMP/logo.svg" "$TMP/logo.png"
convert -background none -density 400 "$TMP/mark.svg" "$TMP/mark.png"

# Imagen de compartir por defecto (Open Graph / Twitter): 1200×630
convert -size 1200x630 "xc:$BACKGROUND" \( "$TMP/logo.png" -resize 760x \) \
    -gravity center -composite -strip "$PUBLIC_DIR/og-default.png"

# Iconos cuadrados: el logo centrado con margen
square_icon() { # tamaño, fondo, fichero
    local size="$1" background="$2" out="$3"
    local inner=$((size * 84 / 100))
    convert -size "${size}x${size}" "xc:$background" \( "$TMP/mark.png" -resize "${inner}x${inner}" \) \
        -gravity center -composite -strip "$out"
}

square_icon 180 "$BACKGROUND" "$PUBLIC_DIR/apple-touch-icon.png"
square_icon 192 "$BACKGROUND" "$PUBLIC_DIR/icon-192.png"
square_icon 512 "$BACKGROUND" "$PUBLIC_DIR/icon-512.png"

for size in 16 32 48; do
    square_icon "$size" none "$TMP/favicon-$size.png"
done
convert "$TMP/favicon-16.png" "$TMP/favicon-32.png" "$TMP/favicon-48.png" "$PUBLIC_DIR/favicon.ico"

# Favicon vectorial: el mismo logo en un lienzo cuadrado
sed 's/viewBox="[^"]*"/viewBox="-27 -170.7 593.37 593.37"/' "$TMP/mark-classes.svg" > "$PUBLIC_DIR/favicon.svg"

echo "Generado en $PUBLIC_DIR:"
ls -1 "$PUBLIC_DIR" | grep -E '^(og-default\.png|apple-touch-icon\.png|icon-(192|512)\.png|favicon\.(ico|svg))$'
