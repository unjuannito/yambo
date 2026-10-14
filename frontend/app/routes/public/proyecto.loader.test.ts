import { describe, it, expect, vi, beforeEach } from "vitest";
import { loader } from "./proyecto";

const getProjectDetail = vi.hoisted(() => vi.fn());
vi.mock("~/services/publicService.server", () => ({ getProjectDetail }));
vi.mock("~/utils/env.server", () => ({ getSiteUrl: () => "https://yambo.test" }));

const project = { id: "PRJ001", slug: "jambo", name: "Jambo", active: true, groups: [], staff: [], seo: null };

function load(projectId: string) {
    return loader({ params: { projectId } } as unknown as Parameters<typeof loader>[0]);
}

describe("proyecto — loader", () => {
    beforeEach(() => {
        getProjectDetail.mockReset();
    });

    it("serves the project on its readable URL", async () => {
        getProjectDetail.mockResolvedValue(project);

        await expect(load("jambo")).resolves.toMatchObject({ project: { id: "PRJ001" } });
    });

    it("redirects the old id URL permanently to the readable one", async () => {
        getProjectDetail.mockResolvedValue(project);

        const thrown = await load("PRJ001").catch((e) => e);

        expect(thrown).toBeInstanceOf(Response);
        expect(thrown.status).toBe(301);
        expect(thrown.headers.get("Location")).toBe("/proyectos/jambo");
    });

    it("keeps serving by id while the project has no slug yet", async () => {
        getProjectDetail.mockResolvedValue({ ...project, slug: null });

        await expect(load("PRJ001")).resolves.toMatchObject({ project: { id: "PRJ001" } });
    });

    it("answers 404 for an unknown project", async () => {
        getProjectDetail.mockRejectedValue(new Error("not found"));

        const thrown = await load("nope").catch((e) => e);

        expect(thrown.status).toBe(404);
    });
});
