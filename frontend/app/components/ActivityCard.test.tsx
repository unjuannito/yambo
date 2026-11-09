import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ActivityCard from "./ActivityCard";
import type { Activity } from "~/types/activity";

// i18n determinista: las aserciones no dependen de la traducción, solo de la
// estructura del avatar/nombre. Evita la inicialización asíncrona de i18next.
vi.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const noop = () => {};

const base: Activity = {
    id: "act1",
    name: "Escape Room a lo grande",
    description: "Una tarde de escape room para los socios.",
    image: null,
    location: "Spark Island, San Sebastián de los Reyes",
    price: 15.75,
    date: "2026-12-20T18:00:00",
    endDate: null,
    status: { value: "OPEN_REGISTRATION", label: "Abierta para apuntarse", color: "#33a35e" },
    public: true,
    project: { id: "E1917cwQ", name: "Concurrencia" },
    manager: { id: "yv95zbB9", name: "Paula Neira", photo: null },
    waitlistCount: 0,
};

describe("ActivityCard - avatar del responsable (#118)", () => {
    it("sin foto: pinta el elefante de Yambo (no el disco de inicial), de 36px", () => {
        render(<ActivityCard activity={base} expanded={false} onToggle={noop} />);

        // El fallback es un <svg role="img" aria-label={nombre}>, no un <img> ni un disco de inicial.
        const avatar = screen.getByRole("img", { name: "Paula Neira" });
        expect(avatar).toBeInTheDocument();
        expect(avatar.tagName.toLowerCase()).toBe("svg");

        // El contenedor del avatar usa el tamaño nuevo (36px = h-9 w-9), no 28px (h-7 w-7).
        expect(avatar.parentElement).toHaveClass("h-9", "w-9", "rounded-full");
    });

    it("con foto: pinta el <img> recortado a 36px, no 28px", () => {
        const withPhoto: Activity = {
            ...base,
            manager: { id: "m2", name: "Javier", photo: "/uploads/paula.jpg" },
        };
        render(<ActivityCard activity={withPhoto} expanded={false} onToggle={noop} />);

        const avatar = screen.getByRole("img", { name: "Javier" });
        expect(avatar.tagName.toLowerCase()).toBe("img");
        expect(avatar).toHaveClass("h-9", "w-9", "rounded-full", "object-cover");
    });

    it("el nombre del responsable puede truncarse (min-w-0) y no se solapa con los botones", () => {
        render(<ActivityCard activity={base} expanded={false} onToggle={noop} />);

        const name = screen.getByText("Paula Neira");
        expect(name).toHaveClass("min-w-0", "truncate");

        // El bloque del responsable ocupa el espacio libre (flex-1) y los botones se alinean a la derecha.
        expect(name.parentElement).toHaveClass("flex-1", "min-w-0");
    });
});
