import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Proyecto from "./proyecto";
import type { ProjectDetail } from "~/services/publicService";

const mockUseLoaderData = vi.hoisted(() => vi.fn());
vi.mock("react-router", () => ({
    useLoaderData: mockUseLoaderData,
}));

vi.mock("~/services/publicService.server", () => ({
    getProjectDetail: vi.fn(),
}));

vi.mock("~/utils/env.server", () => ({
    getSiteUrl: () => "https://yambo.test",
}));

vi.mock("~/components/StaffCard", () => ({
    default: ({ member }: { member: { name: string } }) => <div>{member.name}</div>,
}));

function renderProject(overrides: Partial<ProjectDetail> = {}) {
    const project: ProjectDetail = {
        id: "PRJ001",
        name: "Barrio",
        active: true,
        season: null,
        description: null,
        image: null,
        groups: [],
        staff: [],
        seo: null,
        ...overrides,
    };
    mockUseLoaderData.mockReturnValue({ project, siteUrl: "https://yambo.test" });
    return render(<Proyecto />);
}

describe("Proyecto page – coordination email", () => {
    it("shows the project coordination email as a mailto link", () => {
        renderProject({ coordinationEmail: "barrio@yambo.es" });

        expect(screen.getByRole("heading", { name: "Correo de coordinación" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "barrio@yambo.es" })).toHaveAttribute("href", "mailto:barrio@yambo.es");
    });

    it.each([
        ["null", null],
        ["empty", ""],
        ["blank", "   "],
        ["missing", undefined],
    ])("hides the section when the email is %s", (_label, coordinationEmail) => {
        renderProject({ coordinationEmail });

        expect(screen.queryByRole("heading", { name: "Correo de coordinación" })).not.toBeInTheDocument();
        expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
    });

    it("keeps the email section separate from the coordinators list", () => {
        renderProject({
            coordinationEmail: "barrio@yambo.es",
            staff: [
                {
                    id: "U1",
                    name: "Laura",
                    photo: "",
                    bio: "",
                    funFact: "",
                    role: "COORDINATOR",
                    groups: [{ id: "G1", name: null, projectName: "Barrio", role: "COORDINATOR" }],
                },
            ],
        });

        expect(screen.getByRole("heading", { name: "Correo de coordinación" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Coordinación" })).toBeInTheDocument();
        expect(screen.getByText("Laura")).toBeInTheDocument();
    });
});
