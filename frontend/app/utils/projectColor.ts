import { hashColor, hashCode, GOLDEN_ANGLE } from "./hashColor";

/**
 * Converts a hex color (#rrggbb) to HSL components.
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    if (max === min) return { h: 0, s: 0, l: l * 100 };

    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    let h = 0;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;

    return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Returns bg / text / border color strings for a project.
 * If the project has a signatureColor, derives a cohesive palette from it.
 * Otherwise falls back to the deterministic hashColor.
 */
export function projectColor(
    id: string,
    signatureColor?: string | null,
): { bg: string; text: string; textHover: string; border: string } {
    if (!signatureColor) {
        const base = hashColor(id);
        const h = hashCode(id);
        const hue = (h * GOLDEN_ANGLE) % 360;
        const sat = 30 + (h % 21);
        return { ...base, textHover: `hsl(${hue}, ${sat + 20}%, 22%)` };
    }

    const { h, s } = hexToHsl(signatureColor);
    const sat = Math.max(s, 25); // ensure enough saturation for pastels
    return {
        bg: `hsl(${h}, ${sat}%, 92%)`,
        text: `hsl(${h}, ${sat + 15}%, 30%)`,
        textHover: `hsl(${h}, ${sat + 15}%, 20%)`,
        border: `hsl(${h}, ${sat - 5}%, 78%)`,
    };
}
