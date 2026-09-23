import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import Projects from "./index";
import { ApiError } from "~/types/error";
import type { Project } from "~/services/projectService";

const projectServiceMock = vi.hoisted(() => ({
    listProjects: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    listGroups: vi.fn(),
}));
vi.mock("~/services/projectService", () => ({ projectService: projectServiceMock }));

vi.mock("~/services/projectRoleInvitationService", () => ({
    projectRoleInvitationService: {},
}));

vi.mock("~/hooks/useAuth", () => ({
    useAuth: () => ({ hasPermission: () => true }),
}));

vi.mock("react-router", () => ({
    useNavigate: () => vi.fn(),
}));

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("react-hot-toast", () => ({ default: toastMock }));

vi.mock("~/components/common/RequirePermission", () => ({
    RequirePermission: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("~/components/common/PageContainer", () => ({
    PageContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("~/components/common/Modal", () => ({
    Modal: ({ isOpen, title, children, footer }: { isOpen: boolean; title?: string; children: ReactNode; footer?: ReactNode }) =>
        isOpen ? (
            <div role="dialog" aria-label={title}>
                {children}
                {footer}
            </div>
        ) : null,
}));

vi.mock("~/components/common/FileUploader", () => ({
    default: () => null,
}));

// Render each project with the "actions" column so the edit button is reachable
vi.mock("~/components/common/FilterableTable", () => ({
    FilterableTable: ({ data, columns }: { data: Project[]; columns: { key: string; render: (p: Project) => ReactNode }[] }) => {
        const actions = columns.find((c) => c.key === "id")!;
        return (
            <ul>
                {data.map((p) => (
                    <li key={p.id} data-testid={`row-${p.id}`}>{actions.render(p)}</li>
                ))}
            </ul>
        );
    },
}));

const baseProject: Project = { id: "PRJ001", name: "Barrio", active: true, featured: false };

async function renderPage(projects: Project[] = []) {
    projectServiceMock.listProjects.mockResolvedValue({
        content: projects,
        page: { totalElements: projects.length, totalPages: 1, number: 0, size: 200 },
    });
    render(<Projects />);
    await waitFor(() => expect(projectServiceMock.listProjects).toHaveBeenCalled());
}

function emailInput() {
    return screen.getByLabelText("Correo de coordinación") as HTMLInputElement;
}

async function openEdit(id: string) {
    const row = await screen.findByTestId(`row-${id}`);
    fireEvent.click(row.querySelector("button:nth-of-type(2)")!);
    await screen.findByRole("dialog");
}

describe("Projects admin – coordination email", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        projectServiceMock.listGroups.mockResolvedValue([]);
        projectServiceMock.createProject.mockResolvedValue(baseProject);
        projectServiceMock.updateProject.mockResolvedValue(baseProject);
    });

    it("renders an email input with help text and sends a trimmed email on create", async () => {
        await renderPage();
        fireEvent.click(screen.getByRole("button", { name: /Nuevo Proyecto/ }));

        expect(emailInput()).toHaveAttribute("type", "email");
        expect(emailInput()).toHaveAttribute("placeholder", "coordinacion@ejemplo.com");
        expect(screen.getByText(/Correo público para contactar con la coordinación/)).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Nuevo" } });
        fireEvent.change(emailInput(), { target: { value: "  nuevo@yambo.es  " } });
        fireEvent.click(screen.getByRole("button", { name: "Crear" }));

        await waitFor(() => expect(projectServiceMock.createProject).toHaveBeenCalled());
        expect(projectServiceMock.createProject.mock.calls[0][0]).toMatchObject({
            name: "Nuevo",
            coordinationEmail: "nuevo@yambo.es",
        });
    });

    it("sends null on create when no email is given", async () => {
        await renderPage();
        fireEvent.click(screen.getByRole("button", { name: /Nuevo Proyecto/ }));
        fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Nuevo" } });
        fireEvent.click(screen.getByRole("button", { name: "Crear" }));

        await waitFor(() => expect(projectServiceMock.createProject).toHaveBeenCalled());
        expect(projectServiceMock.createProject.mock.calls[0][0].coordinationEmail).toBeNull();
    });

    it("loads the existing email when editing and sends the edited value", async () => {
        await renderPage([{ ...baseProject, coordinationEmail: "barrio@yambo.es" }]);
        await openEdit("PRJ001");

        expect(emailInput().value).toBe("barrio@yambo.es");

        fireEvent.change(emailInput(), { target: { value: "otro@yambo.es" } });
        fireEvent.click(screen.getByRole("button", { name: "Guardar Cambios" }));

        await waitFor(() => expect(projectServiceMock.updateProject).toHaveBeenCalled());
        expect(projectServiceMock.updateProject).toHaveBeenCalledWith(
            "PRJ001",
            expect.objectContaining({ coordinationEmail: "otro@yambo.es" }),
        );
    });

    it("sends an empty string when the email is cleared so the backend removes it", async () => {
        await renderPage([{ ...baseProject, coordinationEmail: "barrio@yambo.es" }]);
        await openEdit("PRJ001");

        fireEvent.change(emailInput(), { target: { value: "" } });
        fireEvent.click(screen.getByRole("button", { name: "Guardar Cambios" }));

        await waitFor(() => expect(projectServiceMock.updateProject).toHaveBeenCalled());
        expect(projectServiceMock.updateProject.mock.calls[0][1].coordinationEmail).toBe("");
    });

    it("shows a validation error without closing the modal or losing data", async () => {
        await renderPage([{ ...baseProject, season: "2026", coordinationEmail: "barrio@yambo.es" }]);
        await openEdit("PRJ001");

        fireEvent.change(emailInput(), { target: { value: "no-es-un-correo" } });
        fireEvent.click(screen.getByRole("button", { name: "Guardar Cambios" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("Introduce un correo electrónico válido");
        expect(projectServiceMock.updateProject).not.toHaveBeenCalled();
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Barrio");
        expect((screen.getByLabelText("Temporada") as HTMLInputElement).value).toBe("2026");
        expect(emailInput().value).toBe("no-es-un-correo");
    });

    it("shows the backend validation error inline and keeps the modal open", async () => {
        projectServiceMock.updateProject.mockRejectedValue(new ApiError({
            id: "E1",
            timestamp: "",
            type: "BAD_REQUEST",
            message: "Invalid coordination email",
            path: "/projects/PRJ001",
            status: 400,
        }));
        await renderPage([baseProject]);
        await openEdit("PRJ001");

        fireEvent.change(emailInput(), { target: { value: "a@b.es" } });
        fireEvent.click(screen.getByRole("button", { name: "Guardar Cambios" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("Introduce un correo electrónico válido");
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(toastMock.error).not.toHaveBeenCalled();
    });
});
