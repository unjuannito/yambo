import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResponsiveImage } from "./ResponsiveImage";

describe("ResponsiveImage", () => {
    it("offers resized versions of an uploaded image and loads it lazily", () => {
        render(<ResponsiveImage src="/uploads/foto.jpg" alt="Foto" sizes="220px" maxWidth={320} className="w-full" />);

        const img = screen.getByAltText("Foto");
        expect(img).toHaveAttribute("src", "/uploads/foto.jpg");
        expect(img).toHaveAttribute("srcset", "/uploads/_w/160/foto.jpg 160w, /uploads/_w/320/foto.jpg 320w");
        expect(img).toHaveAttribute("sizes", "220px");
        expect(img).toHaveAttribute("loading", "lazy");
        expect(img).toHaveClass("w-full");
    });

    it("behaves like a plain image for anything else", () => {
        render(<ResponsiveImage src="/logo.png" alt="Logo" sizes="100px" />);

        const img = screen.getByAltText("Logo");
        expect(img).not.toHaveAttribute("srcset");
        expect(img).not.toHaveAttribute("sizes");
    });

    it("loads the main image of a page eagerly", () => {
        render(<ResponsiveImage src="/uploads/portada.jpg" alt="Portada" sizes="100vw" priority />);

        const img = screen.getByAltText("Portada");
        expect(img).toHaveAttribute("loading", "eager");
        expect(img).toHaveAttribute("fetchpriority", "high");
    });
});
