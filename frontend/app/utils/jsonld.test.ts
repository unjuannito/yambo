import { describe, it, expect } from "vitest";
import { activityJsonLd } from "./jsonld";
import type { Activity } from "~/types/activity";

const SITE_URL = "https://yambo.cabrasky.net";

const baseActivity: Activity = {
    id: "ACT001",
    name: "Taller de Navidad",
    description: "Un taller navideño para toda la familia",
    image: "/uploads/navidad.jpg",
    location: "Local Yambo",
    price: 5.0,
    date: "2026-12-20T10:00:00",
    endDate: "2026-12-20T18:00:00",
    status: { value: "OPEN_REGISTRATION", label: "Abierta", color: "#22c55e" },
    public: true,
    project: { id: "PRJ001", name: "Barrio" },
    manager: { id: "U0001", name: "Ana", photo: "/uploads/ana.jpg" },
    waitlistCount: 0,
};

describe("activityJsonLd", () => {
    it("returns Event with all fields when fully populated", () => {
        const result = activityJsonLd(baseActivity, SITE_URL);

        expect(result).toMatchObject({
            "@context": "https://schema.org",
            "@type": "Event",
            name: "Taller de Navidad",
            description: "Un taller navideño para toda la familia",
            url: "https://yambo.cabrasky.net/actividades/ACT001",
            startDate: "2026-12-20T10:00:00",
            endDate: "2026-12-20T18:00:00",
            eventStatus: "https://schema.org/EventScheduled",
            eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        });

        // Location
        expect(result.location).toMatchObject({
            "@type": "Place",
            name: "Local Yambo",
        });

        // Offer
        expect(result.offers).toMatchObject({
            "@type": "Offer",
            price: 5.0,
            priceCurrency: "EUR",
        });

        // Organizer
        expect(result.organizer).toMatchObject({
            "@type": "NGO",
            name: "Yambo",
            url: SITE_URL,
        });

        expect(result.image).toBe("/uploads/navidad.jpg");
        expect(result.inLanguage).toBe("es");
    });

    it("sets EventScheduled status for PLANNED", () => {
        const activity = {
            ...baseActivity,
            status: { value: "PLANNED", label: "Planificada", color: "#3b82f6" },
        };
        const result = activityJsonLd(activity, SITE_URL);
        expect(result.eventStatus).toBe("https://schema.org/EventScheduled");
    });

    it("sets EventCompleted status for CLOSED", () => {
        const activity = {
            ...baseActivity,
            status: { value: "CLOSED", label: "Cerrada", color: "#6b7280" },
            date: "2026-01-01T10:00:00",
        };
        const result = activityJsonLd(activity, SITE_URL);
        expect(result.eventStatus).toBe("https://schema.org/EventCompleted");
    });

    it("sets EventCancelled status for CANCELLED", () => {
        const activity = {
            ...baseActivity,
            status: { value: "CANCELLED", label: "Cancelada", color: "#ef4444" },
            date: "2026-01-01T10:00:00",
        };
        const result = activityJsonLd(activity, SITE_URL);
        expect(result.eventStatus).toBe("https://schema.org/EventCancelled");
    });

    it("sets SoldOut availability for past events", () => {
        const pastActivity = {
            ...baseActivity,
            date: "2024-01-01T10:00:00",
            status: { value: "CLOSED", label: "Cerrada", color: "#6b7280" },
        };
        const result = activityJsonLd(pastActivity, SITE_URL);
        expect(result.offers!.availability).toBe("https://schema.org/SoldOut");
    });

    it("sets InStock availability for future events", () => {
        const futureActivity = {
            ...baseActivity,
            date: "2099-12-20T10:00:00",
            status: { value: "OPEN_REGISTRATION", label: "Abierta", color: "#22c55e" },
        };
        const result = activityJsonLd(futureActivity, SITE_URL);
        expect(result.offers!.availability).toBe("https://schema.org/InStock");
    });

    it("omits optional fields when not provided", () => {
        const minimal: Activity = {
            id: "ACT002",
            name: "Mínima",
            description: null,
            image: null,
            location: null,
            price: null,
            date: null,
            endDate: null,
            status: null,
            public: true,
            project: null,
            manager: null,
            waitlistCount: 0,
        };
        const result = activityJsonLd(minimal, SITE_URL);

        expect(result).toMatchObject({
            "@type": "Event",
            name: "Mínima",
            url: `${SITE_URL}/actividades/ACT002`,
            eventStatus: "https://schema.org/EventScheduled",
            eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        });
        expect(result.image).toBeUndefined();
        expect(result.location).toBeUndefined();
        expect(result.offers).toBeUndefined();
        expect(result.startDate).toBeUndefined();
        expect(result.endDate).toBeUndefined();
    });

    it("falls back to EventScheduled for unknown status", () => {
        const activity = {
            ...baseActivity,
            status: { value: "UNKNOWN", label: "?", color: "#000000" },
        };
        const result = activityJsonLd(activity, SITE_URL);
        expect(result.eventStatus).toBe("https://schema.org/EventScheduled");
    });
});
