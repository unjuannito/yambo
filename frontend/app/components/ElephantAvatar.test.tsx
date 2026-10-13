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

    it("draws a different trunk when it is raised", () => {
        const base = avatarFromSeed("U0000001");
        const lowered = render(<ElephantAvatar seed="U0000001" config={{ ...base, trunkUp: false }} />).container.innerHTML;
        const raised = render(<ElephantAvatar seed="U0000001" config={{ ...base, trunkUp: true }} />).container.innerHTML;

        expect(lowered).not.toBe(raised);
    });

    it("renders complete avatar examples with the cap, clothes, eyes and hair", () => {
        const cappedElephant = render(
            <ElephantAvatar
                seed="cap-example"
                config={{
                    background: 3,
                    clothes: "hoodie",
                    eyes: "glasses",
                    hair: "fringe",
                    top: "cap",
                    extra: "blush",
                    trunkUp: true,
                    flip: false,
                }}
            />
        );
        expect(cappedElephant.getByRole("img")).toBeInTheDocument();
        expect(cappedElephant.container.querySelector('path[d="M70 188 C76 178 124 178 130 188 C130 206 70 206 70 188 Z"]')).toBeInTheDocument();
        expect(cappedElephant.container.querySelector('circle[cx="80"][cy="100"][r="14"]')).toBeInTheDocument();
        expect(cappedElephant.container.querySelector('path[d="M48 84 C26 86 22 120 38 136 M152 84 C174 86 178 120 162 136"]')).toBeInTheDocument();

        const beanieElephant = render(
            <ElephantAvatar
                seed="beanie-example"
                config={{
                    background: 7,
                    clothes: "tee-heart",
                    eyes: "happy",
                    hair: "fringe",
                    top: "beanie",
                    extra: "freckles",
                    trunkUp: false,
                    flip: true,
                }}
            />
        );

        expect(beanieElephant.container.querySelector('path[d="M54 84 C52 34 148 34 146 84 Z"]')).toBeInTheDocument();
        expect(beanieElephant.container.querySelector('path[d="M100 240 c-24 -16 -20 -34 -9 -34 c5 0 9 4 9 9 c0 -5 4 -9 9 -9 c11 0 15 18 -9 34 Z"]')).toBeInTheDocument();
        expect(beanieElephant.container.querySelector('path[d="M52 94 C48 36 152 36 148 94 L138 78 L128 90 L116 76 L104 90 L92 76 L80 90 L70 78 L60 92 Z"]')).toBeInTheDocument();
        expect(beanieElephant.container.querySelector('path[d="M71 102 q9 -11 18 0 M111 102 q9 -11 18 0"]')).toBeInTheDocument();
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
