import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import ProjectsShell from "./_shell";
import type { Project } from "~/services/projectService";

const projectServiceMock = vi.hoisted(() => ({
    listProjects: vi.fn(),
    createProject: vi.fn(),
}));
vi.mock("~/services/projectService", () => ({ projectService: projectServiceMock }));

const permissions = vi.hoisted(() => ({ denied: [] as string[] }));
vi.mock("~/hooks/useAuth", () => ({
    useAuth: () => ({
        hasPermission: ({ obj, action }: { obj: string; action: string }) => !permissions.denied.includes(`${obj}:${action}`),
    }),
}));

const navigateMock = vi.hoisted(() => vi.fn());
vi.mock("react-router", () => ({
    useNavigate: () => navigateMock,
    NavLink: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
    Outlet: () => <div data-testid="outlet" />,
}));

vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

vi.mock("~/components/common/RequirePermission", () => ({
    RequirePermission: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("~/components/common/FileUploader", () => ({
    default: () => null,
}));

const projects: Project[] = [
    { id: "P2", name: "Viejo", active: false, featured: false },
    { id: "P1", name: "Jambo", active: true, featured: false },
    { id: "P0", name: "Barrio", active: true, featured: false },
];

async function renderShell() {
    projectServiceMock.listProjects.mockResolvedValue({ content: projects });
    render(<ProjectsShell />);
    await screen.findByTestId("outlet");
}

describe("ProjectsShell", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        permissions.denied = [];
    });

    it("lists the whole team first and then the projects, active ones on top", async () => {
        await renderShell();

        const links = screen.getAllByRole("link");
        expect(links.map((a) => a.getAttribute("href"))).toEqual([
            "/mi-espacio/proyectos",
            "/mi-espacio/proyectos/P0",
            "/mi-espacio/proyectos/P1",
            "/mi-espacio/proyectos/P2",
        ]);
        expect(links[0]).toHaveTextContent("Todo el equipo");
        expect(links[3]).toHaveTextContent("Inactivo");
    });

    it("hides the whole-team entry from people who cannot read users", async () => {
        permissions.denied = ["user:read"];
        await renderShell();

        expect(screen.queryByText("Todo el equipo")).not.toBeInTheDocument();
    });

    it("creates a project with a trimmed coordination email and opens it", async () => {
        projectServiceMock.createProject.mockResolvedValue({ id: "P9", name: "Nuevo", active: true, featured: false });
        await renderShell();

        fireEvent.click(screen.getByRole("button", { name: /Nuevo Proyecto/ }));
        fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Nuevo" } });
        fireEvent.change(screen.getByLabelText("Correo de coordinación"), { target: { value: "  nuevo@yambo.es  " } });
        fireEvent.click(screen.getByRole("button", { name: "Crear" }));

        await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/mi-espacio/proyectos/P9/equipo"));
        expect(projectServiceMock.createProject.mock.calls[0][0]).toMatchObject({
            name: "Nuevo",
            coordinationEmail: "nuevo@yambo.es",
        });
    });

    it("sends null when the new project has no coordination email", async () => {
        projectServiceMock.createProject.mockResolvedValue({ id: "P9", name: "Nuevo", active: true, featured: false });
        await renderShell();

        fireEvent.click(screen.getByRole("button", { name: /Nuevo Proyecto/ }));
        fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Nuevo" } });
        fireEvent.click(screen.getByRole("button", { name: "Crear" }));

        await waitFor(() => expect(projectServiceMock.createProject).toHaveBeenCalled());
        expect(projectServiceMock.createProject.mock.calls[0][0].coordinationEmail).toBeNull();
    });
});
