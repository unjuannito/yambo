import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AddPersonModal } from "./AddPersonModal";
import type { AssignTarget } from "~/utils/groupOptions";

const adminUserServiceMock = vi.hoisted(() => ({
    createStaff: vi.fn(),
    assignGroupRole: vi.fn(),
    listUsers: vi.fn(),
}));
vi.mock("~/services/adminUserService", () => ({ adminUserService: adminUserServiceMock }));

const invitationServiceMock = vi.hoisted(() => ({ createInvitation: vi.fn() }));
vi.mock("~/services/projectRoleInvitationService", () => ({ projectRoleInvitationService: invitationServiceMock }));

const permissions = vi.hoisted(() => ({ denied: [] as string[] }));
vi.mock("~/hooks/useAuth", () => ({
    useAuth: () => ({
        hasPermission: ({ obj, action }: { obj: string; action: string }) => !permissions.denied.includes(`${obj}:${action}`),
    }),
}));

vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const barrio: AssignTarget = {
    projectId: "P1",
    projectName: "Barrio",
    defaultGroupId: "G0",
    groups: [{ id: "G1", name: "Peques" }, { id: "G2", name: "Mayores" }],
};
const jambo: AssignTarget = { projectId: "P2", projectName: "Jambo", defaultGroupId: "J0", groups: [] };

const onDone = vi.fn();
const onClose = vi.fn();

function renderModal(props: Partial<Parameters<typeof AddPersonModal>[0]> = {}) {
    render(<AddPersonModal isOpen onClose={onClose} onDone={onDone} targets={[barrio, jambo]} {...props} />);
}

describe("AddPersonModal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        permissions.denied = [];
        adminUserServiceMock.createStaff.mockResolvedValue({});
        adminUserServiceMock.assignGroupRole.mockResolvedValue({});
    });

    it("creates a new person straight into the group the button belonged to", async () => {
        renderModal({ targets: [barrio], fixedProject: true, preset: { projectId: "P1", groupId: "G1", role: "MONITOR" } });

        expect(screen.queryByLabelText("Proyecto (opcional)")).not.toBeInTheDocument();
        expect((screen.getByLabelText("Grupo") as HTMLSelectElement).value).toBe("G1");

        fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: " Laura García " } });
        fireEvent.click(screen.getByRole("button", { name: "Crear persona" }));

        await waitFor(() => expect(adminUserServiceMock.createStaff).toHaveBeenCalled());
        expect(adminUserServiceMock.createStaff).toHaveBeenCalledWith({
            name: "Laura García",
            nickname: undefined,
            email: undefined,
            groupId: "G1",
            role: "MONITOR",
        });
        expect(onDone).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });

    it("sends coordinators to the project-level group whatever group was selected", async () => {
        renderModal({ targets: [barrio], fixedProject: true, preset: { projectId: "P1", groupId: "G2" } });

        fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: "Ana" } });
        fireEvent.change(screen.getByLabelText("Rol"), { target: { value: "COORDINATOR" } });
        expect(screen.queryByLabelText("Grupo")).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Crear persona" }));

        await waitFor(() => expect(adminUserServiceMock.createStaff).toHaveBeenCalled());
        expect(adminUserServiceMock.createStaff.mock.calls[0][0]).toMatchObject({ groupId: "G0", role: "COORDINATOR" });
    });

    it("lets the whole-team view create someone without a project", async () => {
        renderModal();

        fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: "Pablo" } });
        fireEvent.click(screen.getByRole("button", { name: "Crear persona" }));

        await waitFor(() => expect(adminUserServiceMock.createStaff).toHaveBeenCalled());
        expect(adminUserServiceMock.createStaff.mock.calls[0][0]).toMatchObject({ groupId: undefined, role: undefined });
    });

    it("assigns an existing user as monitor of a project without age groups", async () => {
        adminUserServiceMock.listUsers.mockResolvedValue({ content: [{ id: "U7", name: "Marta Ruiz", email: "marta@yambo.es" }] });
        renderModal();

        fireEvent.click(screen.getByRole("tab", { name: "Ya tiene usuario" }));
        fireEvent.change(screen.getByLabelText("Buscar usuario"), { target: { value: "mar" } });
        fireEvent.click(await screen.findByRole("button", { name: /Marta Ruiz/ }));

        const add = screen.getByRole("button", { name: "Añadir" });
        expect(add).toBeDisabled();
        fireEvent.change(screen.getByLabelText("Proyecto"), { target: { value: "P2" } });
        fireEvent.click(add);

        await waitFor(() => expect(adminUserServiceMock.assignGroupRole).toHaveBeenCalledWith("U7", "J0", "MONITOR"));
    });

    it("generates an invitation link for the project", async () => {
        invitationServiceMock.createInvitation.mockResolvedValue({ invitationLink: "https://yambo.test/i/abc" });
        renderModal({ targets: [barrio], fixedProject: true, preset: { projectId: "P1" } });

        fireEvent.click(screen.getByRole("tab", { name: "Enlace" }));
        fireEvent.click(screen.getByRole("button", { name: "Generar enlace" }));

        expect(await screen.findByText("https://yambo.test/i/abc")).toBeInTheDocument();
        expect(invitationServiceMock.createInvitation).toHaveBeenCalledWith({
            projectId: "P1",
            role: "MONITOR",
            maxUses: undefined,
            expiresAt: undefined,
        });
    });

    it("only offers what the user is allowed to do", () => {
        permissions.denied = ["user:create", "invitation:create"];
        renderModal();

        expect(screen.queryByRole("tab")).not.toBeInTheDocument();
        expect(screen.getByLabelText("Buscar usuario")).toBeInTheDocument();
    });
});
