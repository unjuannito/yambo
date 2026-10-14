import { describe, it, expect } from "vitest";
import { variantSrcSet, variantUrl } from "./imageVariants";

describe("variantUrl", () => {
    it("points uploaded images to their resized version", () => {
        expect(variantUrl("/uploads/foto_a1b2c3d4.jpg", 480)).toBe("/uploads/_w/480/foto_a1b2c3d4.jpg");
        expect(variantUrl("/uploads/Foto.PNG", 160)).toBe("/uploads/_w/160/Foto.PNG");
    });

    it("keeps the /api prefix and absolute URLs", () => {
        expect(variantUrl("/api/uploads/foto.webp", 800)).toBe("/api/uploads/_w/800/foto.webp");
        expect(variantUrl("https://yambo.test/uploads/foto.jpeg", 320)).toBe("https://yambo.test/uploads/_w/320/foto.jpeg");
    });

    it("leaves alone what cannot be resized", () => {
        expect(variantUrl("/uploads/logo.svg", 480)).toBeNull();
        expect(variantUrl("/uploads/baile.gif", 480)).toBeNull();
        expect(variantUrl("/heroImage.jpg", 480)).toBeNull();
        expect(variantUrl("https://cdn.example.com/a.jpg", 480)).toBeNull();
        expect(variantUrl("/uploads/_w/480/foto.jpg", 480)).toBeNull();
        expect(variantUrl(null, 480)).toBeNull();
    });
});

describe("variantSrcSet", () => {
    it("lists every width up to the maximum", () => {
        expect(variantSrcSet("/uploads/foto.jpg", 480)).toBe(
            "/uploads/_w/160/foto.jpg 160w, /uploads/_w/320/foto.jpg 320w, /uploads/_w/480/foto.jpg 480w",
        );
    });

    it("is undefined for images without variants", () => {
        expect(variantSrcSet("/logo.png")).toBeUndefined();
        expect(variantSrcSet(undefined)).toBeUndefined();
    });
});
