import { describe, expect, it } from "vitest";
import type { Activity } from "~/types/activity";
import {
    activitiesCard,
    activityCard,
    contactCard,
    homeCard,
    HOME_SHARE_DEFAULTS,
    isSharePage,
    legalCard,
    staffCard,
    activityCardVersion,
    activityWhen,
    priceLabel,
    projectCard,
    projectCardVersion,
    projectInvitationCard,
    shareImagePaths,
} from "./shareCards";

const NOW = new Date("2026-10-19T12:00:00Z");

const activity: Activity = {
    id: "ACT001",
    name: "Excursión a la Pedriza",
    description: null,
    image: "/uploads/pedriza_abc12345.jpg",
    location: "Manzanares el Real",
    price: 12,
    date: "2026-11-08T09:30:00Z",
    endDate: null,
    status: { value: "OPEN_REGISTRATION", label: "Abierta", color: "#32a45e" },
    public: true,
    project: { id: "P1", name: "Campamento Urbano" },
    manager: null,
    waitlistCount: 0,
};

describe("activityWhen", () => {
    it("shows the day and the time in Madrid", () => {
        expect(activityWhen(activity)).toBe("dom, 8 nov · 10:30");
    });

    it("reads dates without a zone as Madrid time, as the API sends them", () => {
        expect(activityWhen({ date: "2026-07-29T19:00:00", endDate: null })).toBe("mié, 29 jul · 19:00");
    });

    it("leaves out a midnight time, which usually means no time was set", () => {
        expect(activityWhen({ date: "2026-11-07T23:00:00Z", endDate: null })).toBe("dom, 8 nov");
    });

    it("shows the range for activities lasting several days", () => {
        expect(activityWhen({ date: "2026-07-01T08:00:00Z", endDate: "2026-07-15T16:00:00Z" })).toBe("1 jul – 15 jul");
    });

    it("is empty without a date or with one that cannot be read", () => {
        expect(activityWhen({ date: null, endDate: null })).toBeNull();
        expect(activityWhen({ date: "no-es-fecha", endDate: null })).toBeNull();
    });

    it("does not break on mistyped years", () => {
        expect(activityWhen({ date: "0202-10-17T17:00:00", endDate: null })).not.toMatch(/Invalid/);
    });
});

describe("priceLabel", () => {
    it("says free activities are free", () => {
        expect(priceLabel(0)).toBe("Gratis");
        expect(priceLabel(12.5)).toBe("12,5 €");
        expect(priceLabel(null)).toBeNull();
    });
});

describe("activityCard", () => {
    it("tells the project, date, place, price and whether registration is open", () => {
        expect(activityCard(activity, NOW)).toEqual({
            eyebrow: "Campamento Urbano",
            title: "Excursión a la Pedriza",
            details: ["dom, 8 nov · 10:30", "Manzanares el Real", "12 €"],
            badge: { label: "Inscripciones abiertas", tone: "positive" },
            image: "/uploads/pedriza_abc12345.jpg",
        });
    });

    it("warns when the activity is cancelled or already over", () => {
        const cancelled = { ...activity, status: { value: "CANCELLED", label: "", color: "" } };
        expect(activityCard(cancelled, NOW).badge).toEqual({ label: "Cancelada", tone: "negative" });
        expect(activityCard(activity, new Date("2026-12-01")).badge).toEqual({ label: "Ya celebrada", tone: "neutral" });
    });
});

describe("activityCardVersion", () => {
    it("changes when something shown on the card changes", () => {
        const version = activityCardVersion(activity, NOW);

        expect(activityCardVersion({ ...activity }, NOW)).toBe(version);
        expect(activityCardVersion({ ...activity, name: "Otra" }, NOW)).not.toBe(version);
        expect(activityCardVersion(activity, new Date("2026-12-01"))).not.toBe(version);
    });

    it("goes in the image URL", () => {
        expect(shareImagePaths.activity(activity, "abc")).toBe("/og/actividades/ACT001?v=abc");
    });
});

describe("projectCard", () => {
    it("uses the project's colour and season", () => {
        expect(projectCard({ name: "Ludoteca", season: "2026-27", image: null, signatureColor: "#956bbd", active: true })).toMatchObject({
            eyebrow: "Proyecto · 2026-27",
            title: "Ludoteca",
            accent: "#956bbd",
            badge: null,
            people: [],
        });
    });

    it("shows the faces of the project's team", () => {
        const card = projectCard({ name: "Jamboloko", staff: [{ photo: "/uploads/a.jpg" }, { photo: "/uploads/b.jpg" }] });

        expect(card.people).toEqual(["/uploads/a.jpg", "/uploads/b.jpg"]);
        expect(card.details).toEqual(["Con 2 monitores"]);
    });

    it("gets a new version when the team changes", () => {
        expect(projectCardVersion({ name: "Jamboloko", staff: [] }))
            .not.toBe(projectCardVersion({ name: "Jamboloko", staff: [{ photo: "/uploads/a.jpg" }] }));
    });
});

describe("homeCard", () => {
    it("uses the texts and image set in the admin", () => {
        expect(homeCard({
            "home.share.eyebrow": "Desde 2001",
            "home.share.title": "Únete a Yambo",
            "home.share.subtitle": "Viernes por la tarde",
            "home.share.image": "/uploads/portada.jpg",
            "home.hero.image": "/uploads/hero.webp",
        })).toEqual({
            eyebrow: "Desde 2001",
            title: "Únete a Yambo",
            details: ["Viernes por la tarde"],
            image: "/uploads/portada.jpg",
        });
    });

    it("falls back to the default texts and the hero image", () => {
        expect(homeCard({ "home.share.title": "  ", "home.hero.image": "/uploads/hero.webp" })).toEqual({
            eyebrow: HOME_SHARE_DEFAULTS.eyebrow,
            title: HOME_SHARE_DEFAULTS.title,
            details: [HOME_SHARE_DEFAULTS.subtitle],
            image: "/uploads/hero.webp",
        });
    });
});

describe("projectInvitationCard", () => {
    const invitation = { projectName: "Campamento", role: "MONITOR" as const, used: false, expired: false, disabled: false };

    it("says which project and role the link is for", () => {
        expect(projectInvitationCard(invitation)).toMatchObject({
            eyebrow: "Invitación",
            title: "Campamento",
            details: ["Te invitan a unirte como monitor/a"],
            badge: null,
        });
    });

    it("does not invite with a link that no longer works", () => {
        expect(projectInvitationCard({ ...invitation, expired: true }).badge).toEqual({ label: "Caducada", tone: "negative" });
        expect(projectInvitationCard({ ...invitation, disabled: true }).badge).toEqual({ label: "Ya no disponible", tone: "negative" });
    });
});

describe("page cards", () => {
    it("only draws the pages on the list", () => {
        expect(isSharePage("equipo")).toBe(true);
        expect(isSharePage("cualquier-cosa")).toBe(false);
    });

    it("puts the team's faces on the team card", () => {
        const card = staffCard([{ photo: "/uploads/a.jpg" }, { photo: null }, { photo: "/uploads/b.jpg" }]);

        expect(card.people).toEqual(["/uploads/a.jpg", "/uploads/b.jpg"]);
        expect(card.details).toEqual(["3 monitores y coordinadores"]);
    });

    it("shows the next upcoming activity on the listing card", () => {
        const later = { ...activity, id: "ACT002", name: "Más tarde", date: "2026-12-20T10:00:00" };
        const cancelled = { ...activity, id: "ACT003", name: "Cancelada", date: "2026-10-25T10:00:00", status: { value: "CANCELLED", label: "", color: "" } };

        const card = activitiesCard([later, cancelled, activity], NOW);

        expect(card.title).toBe("Excursión a la Pedriza");
        expect(card.eyebrow).toBe("2 actividades próximas");
        expect(card.image).toBe(activity.image);
    });

    it("falls back to a general card when nothing is coming up", () => {
        expect(activitiesCard([activity], new Date("2027-01-01")).title).toBe("Actividades de Yambo");
    });

    it("shows how to get in touch", () => {
        expect(contactCard({ "contact.email": "hola@yambo.es", "contact.instagram": "https://instagram.com/yambo_jambo/" }).details)
            .toEqual(["hola@yambo.es", "@yambo_jambo"]);
        expect(contactCard({ "contact.instagram": "@yambo_jambo" }).details).toEqual([undefined, "@yambo_jambo"]);
    });

    it("versions page images by what the card shows", () => {
        const url = shareImagePaths.page("equipo", staffCard([{ photo: "/uploads/a.jpg" }]));

        expect(url).toMatch(/^\/og\/equipo\?v=\w+$/);
        expect(shareImagePaths.page("equipo", staffCard([]))).not.toBe(url);
        expect(shareImagePaths.legal({ id: "privacidad" }, legalCard({ title: "Privacidad" }))).toMatch(/^\/og\/legal\/privacidad\?v=/);
    });
});
