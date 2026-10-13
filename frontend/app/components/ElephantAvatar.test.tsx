import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ElephantAvatar, { avatarFromSeed, hairHiddenBy, normalizeAvatar } from "./ElephantAvatar";

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

    it("draws the saved elephant instead of the seed one", () => {
        const saved = { ...avatarFromSeed("U0000001"), background: 3, hair: "afro" as const, top: "crown" as const };

        const withSaved = render(<ElephantAvatar seed="U0000001" config={saved} />).container.innerHTML;
        const sameFromOtherSeed = render(<ElephantAvatar seed="U0000099" config={saved} />).container.innerHTML;

        expect(withSaved).toBe(sameFromOtherSeed);
    });
});

describe("normalizeAvatar", () => {
    it("falls back to the seed for missing or unknown values", () => {
        const base = avatarFromSeed("U0000001");

        const result = normalizeAvatar({ clothes: "cape", background: 99, eyes: "stars" }, "U0000001");

        expect(result.clothes).toBe(base.clothes);
        expect(result.background).toBe(base.background);
        expect(result.eyes).toBe("stars");
    });

    it("moves hair that old avatars kept as a hat", () => {
        const result = normalizeAvatar({ top: "mohawk" }, "U0000001");

        expect(result.hair).toBe("mohawk");
        expect(result.top).toBe("none");
    });

    it("never gives by default a hairstyle the hat hides completely", () => {
        for (let i = 0; i < 200; i++) {
            const { top, hair } = avatarFromSeed(`seed-${i}`);
            expect(hairHiddenBy(top, hair)).toBe(false);
        }
    });
});
