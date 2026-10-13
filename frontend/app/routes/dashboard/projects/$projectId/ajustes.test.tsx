import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import ProjectSettings from "./ajustes";
import { ApiError } from "~/types/error";
import type { Project } from "~/services/projectService";

const projectServiceMock = vi.hoisted(() => ({
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
}));
vi.mock("~/services/projectService", () => ({ projectService: projectServiceMock }));

vi.mock("~/services/projectRoleInvitationService", () => ({
    projectRoleInvitationService: {},
}));

const context = vi.hoisted(() => ({ project: null as unknown, reloadProjects: vi.fn() }));
vi.mock("react-router", () => ({
    useNavigate: () => vi.fn(),
    useOutletContext: () => context,
}));

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("react-hot-toast", () => ({ default: toastMock }));

vi.mock("~/components/common/RequirePermission", () => ({
    RequirePermission: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("~/components/common/UnsavedChanges", () => ({
    UnsavedChangesGuard: () => null,
    UnsavedChangesNotice: ({ show }: { show: boolean }) => (show ? <span role="status">Cambios sin guardar</span> : null),
}));

vi.mock("~/components/common/FileUploader", () => ({
    default: () => null,
}));

const baseProject: Project = { id: "PRJ001", name: "Barrio", active: true, featured: false };

function renderPage(project: Project = baseProject) {
    context.project = project;
    render(<ProjectSettings />);
}

function emailInput() {
    return screen.getByLabelText("Correo de coordinación") as HTMLInputElement;
}

function save() {
    fireEvent.click(screen.getByRole("button", { name: "Guardar Cambios" }));
}

describe("Project settings – coordination email", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        projectServiceMock.updateProject.mockResolvedValue(baseProject);
    });

    it("renders an email input with help text", () => {
        renderPage();

        expect(emailInput()).toHaveAttribute("type", "email");
        expect(emailInput()).toHaveAttribute("placeholder", "coordinacion@ejemplo.com");
        expect(screen.getByText(/Correo público para contactar con la coordinación/)).toBeInTheDocument();
    });

    it("loads the existing email and sends the edited value", async () => {
        renderPage({ ...baseProject, coordinationEmail: "barrio@yambo.es" });
        expect(emailInput().value).toBe("barrio@yambo.es");

        fireEvent.change(emailInput(), { target: { value: "  otro@yambo.es " } });
        save();

        await waitFor(() => expect(projectServiceMock.updateProject).toHaveBeenCalled());
        expect(projectServiceMock.updateProject).toHaveBeenCalledWith(
            "PRJ001",
            expect.objectContaining({ coordinationEmail: "otro@yambo.es" }),
        );
        expect(context.reloadProjects).toHaveBeenCalled();
    });

    it("sends an empty string when the email is cleared so the backend removes it", async () => {
        renderPage({ ...baseProject, coordinationEmail: "barrio@yambo.es" });

        fireEvent.change(emailInput(), { target: { value: "" } });
        save();

        await waitFor(() => expect(projectServiceMock.updateProject).toHaveBeenCalled());
        expect(projectServiceMock.updateProject.mock.calls[0][1].coordinationEmail).toBe("");
    });

    it("shows a validation error without losing data", async () => {
        renderPage({ ...baseProject, season: "2026", coordinationEmail: "barrio@yambo.es" });

        fireEvent.change(emailInput(), { target: { value: "no-es-un-correo" } });
        save();

        expect(await screen.findByRole("alert")).toHaveTextContent("Introduce un correo electrónico válido");
        expect(projectServiceMock.updateProject).not.toHaveBeenCalled();
        expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Barrio");
        expect((screen.getByLabelText("Temporada") as HTMLInputElement).value).toBe("2026");
        expect(emailInput().value).toBe("no-es-un-correo");
    });

    it("shows the backend validation error inline", async () => {
        projectServiceMock.updateProject.mockRejectedValue(new ApiError({
            id: "E1",
            timestamp: "",
            type: "BAD_REQUEST",
            message: "Invalid coordination email",
            path: "/projects/PRJ001",
            status: 400,
        }));
        renderPage();

        fireEvent.change(emailInput(), { target: { value: "a@b.es" } });
        save();

        expect(await screen.findByRole("alert")).toHaveTextContent("Introduce un correo electrónico válido");
        expect(toastMock.error).not.toHaveBeenCalled();
    });
});

describe("Project settings – unsaved changes", () => {
    it("only allows saving once something changed", () => {
        renderPage();
        expect(screen.getByRole("button", { name: "Guardar Cambios" })).toBeDisabled();
        expect(screen.queryByRole("status")).not.toBeInTheDocument();

        fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Barrio 2" } });

        expect(screen.getByRole("button", { name: "Guardar Cambios" })).toBeEnabled();
        expect(screen.getByRole("status")).toBeInTheDocument();
    });
});
