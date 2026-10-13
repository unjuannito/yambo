import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ElephantAvatar from "./ElephantAvatar";

describe("ElephantAvatar", () => {
    it("draws the same elephant for the same seed", () => {
        const first = render(<ElephantAvatar seed="U0000001" />).container.innerHTML;
        const second = render(<ElephantAvatar seed="U0000001" />).container.innerHTML;

        expect(first).toBe(second);
    });

    it("varies between people", () => {
        const drawings = new Set(
            ["U0000001", "U0000002", "U0000003", "U0000004", "U0000005", "U0000006"]
                .map((seed) => render(<ElephantAvatar seed={seed} />).container.innerHTML)
        );

        expect(drawings.size).toBeGreaterThan(1);
    });

    it("is labelled for screen readers", () => {
        const { getByRole } = render(<ElephantAvatar seed="U0000001" title="Celi" />);

        expect(getByRole("img", { name: "Celi" })).toBeInTheDocument();
    });
});
