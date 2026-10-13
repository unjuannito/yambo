import { describe, it, expect } from "vitest";
import { DEFAULT_EDIT, FRAME, MAX_ZOOM, normalizeEdit, pan, placement, rotateTo, zoomTo, type PhotoEdit } from "./photoCrop";

/** Comprueba que las cuatro esquinas del marco caen dentro de la foto colocada. */
function coversFrame(imageWidth: number, imageHeight: number, edit: PhotoEdit): boolean {
    const place = placement(imageWidth, imageHeight, edit);
    const radians = (place.rotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const corners = [
        [-FRAME.width / 2, -FRAME.height / 2],
        [FRAME.width / 2, -FRAME.height / 2],
        [FRAME.width / 2, FRAME.height / 2],
        [-FRAME.width / 2, FRAME.height / 2],
    ];
    return corners.every(([cx, cy]) => {
        const dx = cx - place.offsetX;
        const dy = cy - place.offsetY;
        // Al eje de la foto
        const u = dx * cos + dy * sin;
        const v = -dx * sin + dy * cos;
        return Math.abs(u) <= place.width / 2 + 1e-9 && Math.abs(v) <= place.height / 2 + 1e-9;
    });
}

describe("photoCrop", () => {
    it("covers the frame exactly with the default framing", () => {
        const wide = placement(1200, 800, DEFAULT_EDIT);
        expect(wide.height).toBeCloseTo(FRAME.height);
        expect(wide.width).toBeCloseTo(9);
        expect(wide.offsetX).toBeCloseTo(0);

        const tall = placement(600, 1200, DEFAULT_EDIT);
        expect(tall.width).toBeCloseTo(FRAME.width);
        expect(tall.height).toBeCloseTo(10);
    });

    it("moves the photo with the drag and stops at the edge", () => {
        const moved = pan(1200, 800, DEFAULT_EDIT, 1, 0);
        expect(moved.x).toBeCloseTo(0.5);
        expect(placement(1200, 800, moved).offsetX).toBeCloseTo(1);

        const clamped = pan(1200, 800, DEFAULT_EDIT, 50, 50);
        expect(clamped.x).toBe(1);
        // A zoom 1 esta foto no tiene margen vertical
        expect(clamped.y).toBe(0);
        expect(coversFrame(1200, 800, clamped)).toBe(true);
    });

    it("drags along the screen axes even when the photo is rotated", () => {
        const rotated = rotateTo({ ...DEFAULT_EDIT, zoom: 2 }, 90);
        const before = placement(1200, 800, rotated);
        const after = placement(1200, 800, pan(1200, 800, rotated, 0.5, -0.25));
        expect(after.offsetX - before.offsetX).toBeCloseTo(0.5);
        expect(after.offsetY - before.offsetY).toBeCloseTo(-0.25);
    });

    it("never leaves gaps, whatever the framing", () => {
        for (const rotation of [-180, -135, -90, -33, 0, 12, 45, 90, 170]) {
            for (const zoom of [1, 1.7, MAX_ZOOM]) {
                for (const [x, y] of [[0, 0], [1, 1], [-1, 1], [1, -1], [-1, -1], [0.3, -0.8]]) {
                    expect(coversFrame(1200, 800, { x, y, zoom, rotation })).toBe(true);
                    expect(coversFrame(700, 1300, { x, y, zoom, rotation })).toBe(true);
                }
            }
        }
    });

    it("keeps the same point centred when zooming", () => {
        const start = pan(1200, 800, { ...DEFAULT_EDIT, zoom: 2 }, 1.5, 0.5);
        const before = placement(1200, 800, start);
        const zoomed = zoomTo(1200, 800, start, 3);
        const after = placement(1200, 800, zoomed);
        expect(zoomed.zoom).toBe(3);
        expect(after.offsetX / after.width).toBeCloseTo(before.offsetX / before.width);
        expect(after.offsetY / after.height).toBeCloseTo(before.offsetY / before.height);
    });

    it("pulls the photo back in when zooming out", () => {
        const corner = pan(1200, 800, { ...DEFAULT_EDIT, zoom: 3 }, 50, 50);
        const out = zoomTo(1200, 800, corner, 1);
        expect(out.zoom).toBe(1);
        expect(coversFrame(1200, 800, out)).toBe(true);
    });

    it("limits zoom and normalizes rotation and bad values", () => {
        expect(zoomTo(1200, 800, DEFAULT_EDIT, 99).zoom).toBe(MAX_ZOOM);
        expect(zoomTo(1200, 800, DEFAULT_EDIT, 0.2).zoom).toBe(1);
        expect(rotateTo(DEFAULT_EDIT, 270).rotation).toBe(-90);
        expect(rotateTo(DEFAULT_EDIT, -270).rotation).toBe(90);
        expect(rotateTo(DEFAULT_EDIT, 180).rotation).toBe(180);
        expect(normalizeEdit(null)).toEqual(DEFAULT_EDIT);
        expect(normalizeEdit({ x: 7, y: NaN, zoom: -3 })).toEqual({ x: 1, y: 0, zoom: 1, rotation: 0 });
    });
});
