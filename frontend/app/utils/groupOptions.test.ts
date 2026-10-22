import { describe, expect, it, vi } from "vitest";
import { loadAssignableGroupOptions } from "~/utils/groupOptions";

describe("loadAssignableGroupOptions", () => {
    it("uses existing default group and appends named groups", async () => {
        const api = {
            listProjects: vi.fn().mockResolvedValue({
                content: [{ id: "P1", name: "Proyecto 1" }],
            }),
            listGroups: vi.fn().mockResolvedValue([
                { id: "G0", name: null, projectId: "P1", projectName: "Proyecto 1" },
                { id: "G1", name: "Infantil", projectId: "P1", projectName: "Proyecto 1" },
            ]),
            createGroup: vi.fn(),
        };

        const options = await loadAssignableGroupOptions(api as any);

        expect(options).toEqual([
            { value: "G0", label: "Proyecto 1 (sin grupo)" },
            { value: "G1", label: "Infantil (Proyecto 1)" },
        ]);
        expect(api.createGroup).not.toHaveBeenCalled();
    });

    it("creates project-level group when missing and uses real id", async () => {
        const api = {
            listProjects: vi.fn().mockResolvedValue({
                content: [{ id: "P2", name: "Proyecto 2" }],
            }),
            listGroups: vi.fn().mockResolvedValue([
                { id: "G2", name: "Grupo A", projectId: "P2", projectName: "Proyecto 2" },
            ]),
            createGroup: vi.fn().mockResolvedValue({
                id: "G2-DEFAULT",
                name: null,
                projectId: "P2",
                projectName: "Proyecto 2",
            }),
        };

        const options = await loadAssignableGroupOptions(api as any);

        expect(api.createGroup).toHaveBeenCalledWith("P2", null);
        expect(options[0]).toEqual({ value: "G2-DEFAULT", label: "Proyecto 2 (sin grupo)" });
        expect(options.some((o) => o.value.startsWith("project:"))).toBe(false);
    });
});