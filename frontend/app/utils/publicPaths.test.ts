import { describe, it, expect } from "vitest";
import { activityPath, projectPath } from "./publicPaths";

describe("public paths", () => {
    it("prefers the readable slug", () => {
        expect(projectPath({ id: "PRJ001", slug: "jambo" })).toBe("/proyectos/jambo");
        expect(activityPath({ id: "ACT001", slug: "campamento-2026" })).toBe("/actividades/campamento-2026");
    });

    it("falls back to the id while there is no slug", () => {
        expect(projectPath({ id: "PRJ001", slug: null })).toBe("/proyectos/PRJ001");
        expect(activityPath({ id: "ACT001" })).toBe("/actividades/ACT001");
    });
});
