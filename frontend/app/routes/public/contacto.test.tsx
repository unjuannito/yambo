import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import Contacto, { loader, toCoordinationContacts } from "./contacto";
import type { ActiveProject } from "~/services/publicService";

const mockUseLoaderData = vi.hoisted(() => vi.fn());
vi.mock("react-router", () => ({
    useLoaderData: mockUseLoaderData,
}));

const serverMocks = vi.hoisted(() => ({
    getContactSettings: vi.fn(),
    getActiveProjects: vi.fn(),
}));
vi.mock("~/services/publicService.server", () => serverMocks);

vi.mock("~/utils/env.server", () => ({
    getSiteUrl: () => "https://yambo.test",
}));

vi.mock("~/utils/confetti", () => ({
    fireEmojiRain: vi.fn(),
}));

function project(id: string, name: string, coordinationEmail?: string | null): ActiveProject {
    return { id, name, season: null, description: null, image: null, featured: false, coordinationEmail };
}

function renderWith(settings: Record<string, string>, coordinationContacts: ReturnType<typeof toCoordinationContacts>) {
    mockUseLoaderData.mockReturnValue({ settings, coordinationContacts, siteUrl: "https://yambo.test" });
    return render(<Contacto />);
}

describe("toCoordinationContacts", () => {
    it("keeps each email paired with its own project and skips projects without email", () => {
        const result = toCoordinationContacts([
            project("P1", "Barrio", "barrio@yambo.es"),
            project("P2", "Sin correo", null),
            project("P3", "Vacío", "   "),
            project("P4", "Campamento", "  campa@yambo.es "),
            project("P5", "Indefinido"),
        ]);

        expect(result).toEqual([
            { projectId: "P1", projectName: "Barrio", email: "barrio@yambo.es" },
            { projectId: "P4", projectName: "Campamento", email: "campa@yambo.es" },
        ]);
    });
});

describe("contacto loader", () => {
    beforeEach(() => {
        serverMocks.getContactSettings.mockReset();
        serverMocks.getActiveProjects.mockReset();
    });

    it("loads active projects and exposes their coordination emails", async () => {
        serverMocks.getContactSettings.mockResolvedValue({ "contact.email": "info@yambo.es" });
        serverMocks.getActiveProjects.mockResolvedValue([project("P1", "Barrio", "barrio@yambo.es")]);

        const data = await loader();

        expect(data.settings["contact.email"]).toBe("info@yambo.es");
        expect(data.coordinationContacts).toEqual([
            { projectId: "P1", projectName: "Barrio", email: "barrio@yambo.es" },
        ]);
    });

    it("still returns the general settings when the projects call fails", async () => {
        serverMocks.getContactSettings.mockResolvedValue({ "contact.email": "info@yambo.es" });
        serverMocks.getActiveProjects.mockRejectedValue(new Error("boom"));

        const data = await loader();

        expect(data.settings["contact.email"]).toBe("info@yambo.es");
        expect(data.coordinationContacts).toEqual([]);
    });
});

describe("Contacto page – coordination emails", () => {
    it("does not render the coordination block when there are no emails", () => {
        renderWith({ "contact.email": "info@yambo.es" }, []);

        expect(screen.queryByText("Correos de coordinación")).not.toBeInTheDocument();
        // General contact email keeps working
        expect(screen.getAllByRole("link", { name: /info@yambo\.es/ })[0]).toHaveAttribute("href", "mailto:info@yambo.es");
    });

    it("renders one row with a mailto link for a single project", () => {
        renderWith({}, [{ projectId: "P1", projectName: "Barrio", email: "barrio@yambo.es" }]);

        const list = screen.getByRole("list", { name: "Correos de coordinación" });
        const items = within(list).getAllByRole("listitem");
        expect(items).toHaveLength(1);
        const link = within(items[0]).getByRole("link");
        expect(link).toHaveAccessibleName("Dudas para el proyecto Barrio barrio@yambo.es");
        expect(link).toHaveAttribute("href", "mailto:barrio@yambo.es");
        // Empty state must not show when only coordination emails exist
        expect(screen.queryByText("Próximamente")).not.toBeInTheDocument();
    });

    it("renders several rows, each linked to its own project email, separate from the general email", () => {
        renderWith(
            { "contact.email": "info@yambo.es" },
            [
                { projectId: "P1", projectName: "Barrio", email: "barrio@yambo.es" },
                { projectId: "P2", projectName: "Campamento", email: "campa@yambo.es" },
            ],
        );

        const list = screen.getByRole("list", { name: "Correos de coordinación" });
        const items = within(list).getAllByRole("listitem");
        expect(items).toHaveLength(2);
        expect(within(items[0]).getByRole("link")).toHaveAccessibleName("Dudas para el proyecto Barrio barrio@yambo.es");
        expect(within(items[0]).getByRole("link")).toHaveAttribute("href", "mailto:barrio@yambo.es");
        expect(within(items[1]).getByRole("link")).toHaveAccessibleName("Dudas para el proyecto Campamento campa@yambo.es");
        expect(within(items[1]).getByRole("link")).toHaveAttribute("href", "mailto:campa@yambo.es");

        expect(within(list).queryByText("info@yambo.es")).not.toBeInTheDocument();
        expect(screen.getAllByRole("link", { name: /info@yambo\.es/ }).length).toBeGreaterThan(0);
    });

    it("renders social links from the settings with their handles", () => {
        renderWith({ "contact.instagram": "@yambo_jambo", "contact.tiktok": "https://tiktok.com/@yambo_jamboo" }, []);

        expect(screen.getByRole("link", { name: /Instagram/ })).toHaveAttribute("href", "https://instagram.com/yambo_jambo");
        expect(screen.getByText("@yambo_jambo")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /TikTok/ })).toHaveAttribute("href", "https://tiktok.com/@yambo_jamboo");
    });

    it("shows the empty state when nothing is configured", () => {
        renderWith({}, []);

        expect(screen.getByText("Próximamente")).toBeInTheDocument();
        expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
    });
});
