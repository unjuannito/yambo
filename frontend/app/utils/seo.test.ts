import { describe, it, expect } from "vitest";
import { absoluteUrl, buildMeta, isIndexableActivity, metaDescription } from "./seo";

const SITE_URL = "https://yambo.cabrasky.net";

function content(meta: ReturnType<typeof buildMeta>, key: string) {
    const entry = meta.find((m) => ("property" in m && m.property === key) || ("name" in m && m.name === key));
    return entry && "content" in entry ? entry.content : undefined;
}


describe("absoluteUrl", () => {
    it("prefixes uploaded files with the site URL", () => {
        expect(absoluteUrl(SITE_URL, "/uploads/foto.jpg")).toBe("https://yambo.cabrasky.net/uploads/foto.jpg");
        expect(absoluteUrl(SITE_URL, "logo.png")).toBe("https://yambo.cabrasky.net/logo.png");
    });

    it("keeps URLs that are already absolute", () => {
        expect(absoluteUrl(SITE_URL, "https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
    });
});

describe("metaDescription", () => {
    it("removes Markdown and line breaks", () => {
        expect(metaDescription("## Taller\n\n**Ven** a _pintar_")).toBe("Taller Ven a pintar");
    });

    it("cuts long text at a word boundary", () => {
        const result = metaDescription("palabra ".repeat(60), 50);

        expect(result.length).toBeLessThanOrEqual(50);
        expect(result.endsWith("palabra…")).toBe(true);
    });
});

describe("isIndexableActivity", () => {
    const now = new Date("2026-06-01T12:00:00");
    const open = { value: "OPEN_REGISTRATION", label: "Abierta", color: "" };

    it("indexes upcoming activities only", () => {
        expect(isIndexableActivity({ date: "2026-06-10T10:00:00", status: open }, now)).toBe(true);
        expect(isIndexableActivity({ date: "2026-05-10T10:00:00", status: open }, now)).toBe(false);
        expect(isIndexableActivity({ date: null, status: open }, now)).toBe(false);
    });

    it("never indexes cancelled activities", () => {
        const cancelled = { value: "CANCELLED", label: "Cancelada", color: "" };
        expect(isIndexableActivity({ date: "2026-06-10T10:00:00", status: cancelled }, now)).toBe(false);
    });
});

describe("buildMeta", () => {
    it("uses absolute URLs for canonical and share image", () => {
        const meta = buildMeta({
            siteUrl: SITE_URL,
            path: "/actividades/ACT001",
            title: "Taller | Yambo",
            description: "Un taller",
            image: "/uploads/taller.jpg",
        });

        expect(meta).toContainEqual({ tagName: "link", rel: "canonical", href: "https://yambo.cabrasky.net/actividades/ACT001" });
        expect(content(meta, "og:url")).toBe("https://yambo.cabrasky.net/actividades/ACT001");
        expect(content(meta, "og:image")).toBe("https://yambo.cabrasky.net/uploads/taller.jpg");
        expect(content(meta, "twitter:image")).toBe("https://yambo.cabrasky.net/uploads/taller.jpg");
        expect(content(meta, "twitter:card")).toBe("summary_large_image");
        expect(content(meta, "robots")).toBe("index, follow");
    });

    it("falls back to the brand share image", () => {
        const meta = buildMeta({ siteUrl: SITE_URL, path: "", title: "Yambo", description: "Asociación" });

        expect(meta).toContainEqual({ tagName: "link", rel: "canonical", href: SITE_URL });
        expect(content(meta, "og:image")).toBe("https://yambo.cabrasky.net/og-default.png");
        expect(content(meta, "og:image:width")).toBe("1200");
        expect(content(meta, "og:image:height")).toBe("630");
        expect(content(meta, "twitter:card")).toBe("summary_large_image");
    });

    it("declares the size of share cards, but not of arbitrary uploads", () => {
        const card = buildMeta({ siteUrl: SITE_URL, path: "/a", title: "A", description: "", image: "/og/actividades/A1?v=x", imageAlt: "Taller" });
        const upload = buildMeta({ siteUrl: SITE_URL, path: "/a", title: "A", description: "", image: "/uploads/taller.jpg" });

        expect(content(card, "og:image:type")).toBe("image/jpeg");
        expect(content(card, "og:image:width")).toBe("1200");
        expect(content(card, "og:image:alt")).toBe("Taller");
        expect(content(upload, "og:image:width")).toBeUndefined();
        expect(content(upload, "og:image:alt")).toBeUndefined();
    });

    it("marks pages that must stay out of search engines", () => {
        const meta = buildMeta({ siteUrl: SITE_URL, path: "/proyectos/P1", title: "Viejo", description: "", index: false });

        expect(content(meta, "robots")).toBe("noindex, follow");
    });
});
