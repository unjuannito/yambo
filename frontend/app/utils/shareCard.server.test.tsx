// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import jpeg from "jpeg-js";
import { imageAspect, renderShareCard, trimWhitespace } from "./shareCard.server";

/** Ancho y alto de un JPEG, y que pese lo bastante poco para las vistas previas. */
function jpegSize(image: Buffer) {
    expect(image[0]).toBe(0xff);
    expect(image[1]).toBe(0xd8);
    // WhatsApp no enseña imágenes de vista previa de más de ~300 KB
    expect(image.length).toBeLessThan(300 * 1024);
    return imageAspect(image) === 1200 / 630 ? { width: 1200, height: 630 } : null;
}

// JPEG mínimo de 1×1 píxel
const TINY_JPEG = Buffer.from(
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
    "base64",
);

describe("renderShareCard", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("reads the proportions of JPEG and PNG files", () => {
        const png = Buffer.alloc(24);
        png.write("\x89PNG", 0, "latin1");
        png.writeUInt32BE(1750, 16);
        png.writeUInt32BE(600, 20);

        expect(imageAspect(png)).toBeCloseTo(1750 / 600);
        expect(imageAspect(TINY_JPEG)).toBe(1);
        expect(imageAspect(Buffer.from("no es una imagen"))).toBeNull();
    });

    it("finds the drawing inside a logo with empty margins", () => {
        // 200×100 en blanco con un cuadrado negro de 40×40 en (80, 30)
        const width = 200, height = 100;
        const pixels = Buffer.alloc(width * height * 4, 255);
        for (let y = 30; y < 70; y++) for (let x = 80; x < 120; x++) pixels.fill(0, (y * width + x) * 4, (y * width + x) * 4 + 3);
        const logo = jpeg.encode({ data: pixels, width, height }, 95).data;

        const trim = trimWhitespace(logo)!;

        expect(trim.left * width).toBeGreaterThan(70);
        expect(trim.left * width).toBeLessThan(80);
        expect(trim.width * width).toBeGreaterThan(40);
        expect(trim.width * width).toBeLessThan(55);
        expect(trimWhitespace(TINY_JPEG)).toBeNull();
    });

    it("draws a 1200×630 JPEG without a photo", async () => {
        const png = await renderShareCard({ eyebrow: "Invitación", title: "Te han invitado a Yambo", details: ["Crea tu cuenta"] });

        expect(jpegSize(png)).toEqual({ width: 1200, height: 630 });
    }, 20_000);

    it("asks the backend for the photo already cropped for sharing", async () => {
        const fetchMock = vi.fn(async (_url: string) => new Response(TINY_JPEG, { headers: { "content-type": "image/jpeg" } }));
        vi.stubGlobal("fetch", fetchMock);

        const png = await renderShareCard({ title: "Taller", image: "/uploads/taller_abc12345.jpg" });

        expect(jpegSize(png)).toEqual({ width: 1200, height: 630 });
        expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/uploads\/_og\/taller_abc12345\.jpg$/);
    }, 20_000);

    it("still draws the card when the photo cannot be used", async () => {
        // Sin libvips el backend redirige al original, que puede ser un WebP que satori no entiende
        vi.stubGlobal("fetch", vi.fn(async () => new Response("webp", { headers: { "content-type": "image/webp" } })));

        const png = await renderShareCard({ title: "Taller", image: "/uploads/taller_abc12345.webp" });

        expect(jpegSize(png)).toEqual({ width: 1200, height: 630 });
    }, 20_000);

    it("ignores images that are not uploads", async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);

        await renderShareCard({ title: "Taller", image: "https://otra-web.com/foto.jpg" });

        expect(fetchMock).not.toHaveBeenCalled();
    }, 20_000);
});
