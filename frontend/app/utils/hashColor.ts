/**
 * Deterministic hash-based color generator.
 * Uses the id string as a seed to produce a unique cream/pastel background
 * with a matching darker text and border color.
 */

function hashCode(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0; // djb2
    }
    return Math.abs(hash);
}

// Golden-angle spacing gives perceptually distinct hues even for sequential ids
const GOLDEN_ANGLE = 137.508;

export function hashColor(id: string): { bg: string; text: string; border: string } {
    const h = hashCode(id);
    // Spread hues evenly using golden angle, then add a hash-based offset
    const hue = (h * GOLDEN_ANGLE) % 360;
    // Keep saturation in 30-50% range for soft pastels
    const sat = 30 + (h % 21);
    const bg     = `hsl(${hue}, ${sat}%, 91%)`;
    const text   = `hsl(${hue}, ${sat + 20}%, 32%)`;
    const border = `hsl(${hue}, ${sat - 5}%, 80%)`;
    return { bg, text, border };
}
