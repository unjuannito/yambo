import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import ProjectTeam from "./equipo";
import type { User } from "~/types/userType";
import type { AddPersonPreset } from "~/components/dashboard/team/AddPersonModal";

const adminUserServiceMock = vi.hoisted(() => ({
    assignGroupRole: vi.fn(),
    removeGroupRole: vi.fn(),
}));
vi.mock("~/services/adminUserService", () => ({ adminUserService: adminUserServiceMock }));

const projectServiceMock = vi.hoisted(() => ({
    createGroup: vi.fn(),
    updateGroup: vi.fn(),
    deleteGroup: vi.fn(),
}));
vi.mock("~/services/projectService", () => ({ projectService: projectServiceMock }));

const permissions = vi.hoisted(() => ({ denied: [] as string[] }));
vi.mock("~/hooks/useAuth", () => ({
    useAuth: () => ({
        hasPermission: ({ obj, action }: { obj: string; action: string }) => !permissions.denied.includes(`${obj}:${action}`),
    }),
}));

const context = vi.hoisted(() => ({ value: null as unknown }));
vi.mock("react-router", () => ({
    useLocation: () => ({ pathname: "/mi-espacio/proyectos/P1/equipo" }),
    useOutletContext: () => context.value,
    Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

vi.mock("~/components/ElephantAvatar", () => ({ default: () => null }));

const addPreset = vi.hoisted(() => ({ last: null as unknown }));
vi.mock("~/components/dashboard/team/AddPersonModal", () => ({
    AddPersonModal: ({ isOpen, preset }: { isOpen: boolean; preset?: AddPersonPreset }) => {
        if (isOpen) addPreset.last = preset;
        return null;
    },
}));
vi.mock("~/components/dashboard/team/GiveAccessModal", () => ({ GiveAccessModal: () => null }));

function person(id: string, name: string, roles: [groupId: string, groupName: string | null, role: "MONITOR" | "COORDINATOR"][]): User {
    return {
        id,
        name,
        email: `${id}@yambo.es`,
        groupRoles: roles.map(([groupId, groupName, role]) => ({ groupId, groupName, projectId: "P1", projectName: "Barrio", role })),
        createdAt: "",
        created_by: "",
        permissions: [],
        profiles: [],
        enabled: true,
    };
}

const reload = vi.fn();
const group = (id: string, name: string | null) => ({ id, name, projectId: "P1", projectName: "Barrio" });

function renderTeam(overrides: { groups?: ReturnType<typeof group>[]; members?: User[] } = {}) {
    const groups = overrides.groups ?? [group("G0", null), group("G1", "Peques"), group("G2", "Mayores")];
    context.value = {
        project: { id: "P1", name: "Barrio", active: true, featured: false },
        groups,
        members: overrides.members ?? [
            person("U1", "Ana", [["G0", null, "COORDINATOR"], ["G1", "Peques", "MONITOR"]]),
            person("U2", "Luis", [["G1", "Peques", "MONITOR"]]),
            person("U3", "Sara", [["G2", "Mayores", "MONITOR"]]),
        ],
        target: {
            projectId: "P1",
            projectName: "Barrio",
            defaultGroupId: "G0",
            groups: groups.filter((g) => g.name).map((g) => ({ id: g.id, name: g.name! })),
        },
        reload,
    };
    render(<ProjectTeam />);
}

const names = (region: HTMLElement) => within(region).getAllByText(/^(Ana|Luis|Sara)$/).map((el) => el.textContent);

function openMenu(region: HTMLElement, name: string) {
    fireEvent.click(within(region).getByRole("button", { name: `Acciones para ${name}` }));
}

describe("ProjectTeam", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        permissions.denied = [];
        addPreset.last = null;
        adminUserServiceMock.assignGroupRole.mockResolvedValue({});
        adminUserServiceMock.removeGroupRole.mockResolvedValue({});
    });

    it("shows coordination and each age group with its own people", () => {
        renderTeam();

        expect(names(screen.getByRole("region", { name: "Coordinación" }))).toEqual(["Ana"]);
        expect(names(screen.getByRole("region", { name: "Peques" }))).toEqual(["Ana", "Luis"]);
        expect(names(screen.getByRole("region", { name: "Mayores" }))).toEqual(["Sara"]);
        expect(screen.queryByRole("region", { name: "Monitores sin grupo" })).not.toBeInTheDocument();
    });

    it("shows a single «Monitores» block for a project without age groups", () => {
        renderTeam({
            groups: [group("G0", null)],
            members: [person("U2", "Luis", [["G0", null, "MONITOR"]])],
        });

        expect(names(screen.getByRole("region", { name: "Barrio" }))).toEqual(["Luis"]);
        expect(screen.getByText("Monitores")).toBeInTheDocument();
    });

    it("prefills the group when adding from a group block", () => {
        renderTeam();

        fireEvent.click(screen.getByRole("button", { name: "Añadir a Mayores" }));
        expect(addPreset.last).toEqual({ projectId: "P1", role: "MONITOR", groupId: "G2" });

        fireEvent.click(screen.getByRole("button", { name: "Añadir a Coordinación" }));
        expect(addPreset.last).toEqual({ projectId: "P1", role: "COORDINATOR", groupId: undefined });
    });

    it("moves a monitor by assigning the new group before leaving the old one", async () => {
        renderTeam();

        openMenu(screen.getByRole("region", { name: "Peques" }), "Luis");
        fireEvent.click(screen.getByRole("menuitem", { name: "Mover a otro grupo" }));
        fireEvent.click(screen.getByRole("button", { name: "Mayores" }));

        await waitFor(() => expect(adminUserServiceMock.removeGroupRole).toHaveBeenCalledWith("U2", "G1", "MONITOR"));
        expect(adminUserServiceMock.assignGroupRole).toHaveBeenCalledWith("U2", "G2", "MONITOR");
        expect(adminUserServiceMock.assignGroupRole.mock.invocationCallOrder[0])
            .toBeLessThan(adminUserServiceMock.removeGroupRole.mock.invocationCallOrder[0]);
        await waitFor(() => expect(reload).toHaveBeenCalled());
    });

    it("keeps the monitor in the old group when the new assignment fails", async () => {
        adminUserServiceMock.assignGroupRole.mockRejectedValue(new Error("boom"));
        renderTeam();

        openMenu(screen.getByRole("region", { name: "Peques" }), "Luis");
        fireEvent.click(screen.getByRole("menuitem", { name: "Mover a otro grupo" }));
        fireEvent.click(screen.getByRole("button", { name: "Mayores" }));

        await waitFor(() => expect(reload).toHaveBeenCalled());
        expect(adminUserServiceMock.removeGroupRole).not.toHaveBeenCalled();
    });

    it("makes a monitor coordinator through the project-level group", async () => {
        renderTeam();

        const peques = screen.getByRole("region", { name: "Peques" });
        openMenu(peques, "Luis");
        fireEvent.click(screen.getByRole("menuitem", { name: "Hacer coordinador" }));

        await waitFor(() => expect(adminUserServiceMock.assignGroupRole).toHaveBeenCalledWith("U2", "G0", "COORDINATOR"));
    });

    it("does not offer coordination to someone who already coordinates", () => {
        renderTeam();

        openMenu(screen.getByRole("region", { name: "Peques" }), "Ana");
        expect(screen.queryByRole("menuitem", { name: "Hacer coordinador" })).not.toBeInTheDocument();
    });

    it("removes only the role of the block after confirming", async () => {
        renderTeam();

        openMenu(screen.getByRole("region", { name: "Coordinación" }), "Ana");
        fireEvent.click(screen.getByRole("menuitem", { name: "Quitar de Coordinación" }));
        expect(adminUserServiceMock.removeGroupRole).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", { name: "Quitar" }));

        await waitFor(() => expect(adminUserServiceMock.removeGroupRole).toHaveBeenCalledWith("U1", "G0", "COORDINATOR"));
        expect(adminUserServiceMock.removeGroupRole).toHaveBeenCalledTimes(1);
    });

    it("hides group deletion from people without project:delete", () => {
        permissions.denied = ["project:delete"];
        renderTeam();

        expect(screen.getByRole("button", { name: "Renombrar el grupo Peques" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Eliminar el grupo Peques" })).not.toBeInTheDocument();
    });

    it("creates a new age group", async () => {
        projectServiceMock.createGroup.mockResolvedValue(group("G3", "Medianos"));
        renderTeam();

        fireEvent.change(screen.getByRole("textbox", { name: "Nuevo grupo" }), { target: { value: " Medianos " } });
        fireEvent.click(screen.getByRole("button", { name: "Nuevo grupo" }));

        await waitFor(() => expect(projectServiceMock.createGroup).toHaveBeenCalledWith("P1", "Medianos"));
    });
});
