import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ActivityDetail, { meta } from "./actividad.$id";

// Mock react-i18next for meta() calls outside React tree (vitest.setup.ts
// provides real i18next for component render tests but meta() runs outside React)
vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const map: Record<string, string> = {
                'public.activitiesTitle': 'Actividades',
                'public.activitiesSubtitle': 'Descubre las actividades abiertas al público',
                'public.activitiesPageTitle': 'Yambo - Actividades | Asociación Juvenil en Alcobendas',
                'public.activitiesMetaDescription': 'Consulta las próximas actividades de Yambo en Alcobendas (Madrid). Eventos de ocio educativo y tiempo libre para niños y adolescentes.',
                'public.activitiesSearch': 'Buscar actividades...',
                'public.activitiesListView': 'Lista',
                'public.activitiesCalendarView': 'Calendario',
                'public.activitiesUpcoming': 'Próximas',
                'public.activitiesPast': 'Pasadas',
                'public.activitiesNoPublic': 'No hay actividades públicas',
                'public.activitiesNoPublicDesc': 'Cuando se publiquen nuevas actividades, las verás aquí. ¡Vuelve pronto!',
                'public.activityCancelledTitle': 'Actividad cancelada',
                'public.activityShare': 'Compartir',
                'public.activityDate': 'Fecha',
                'public.activityLocation': 'Ubicación',
                'public.activityPrice': 'Precio',
                'public.activityProject': 'Proyecto',
                'public.activityRegister': 'Quiero apuntarme',
                'public.waitlistTitle': 'Avísame cuando se abra',
                'public.waitlistDesc': 'Déjanos tu email y te avisaremos',
                'public.waitlistPlaceholder': 'tu@email.com',
                'public.waitlistButton': 'Avísame',
                'public.waitlistSuccess': 'Te avisaremos',
                'public.waitlistDone': 'Te hemos registrado',
                'public.activityDescription': 'Descripción',
                'public.activityUntil': 'hasta',
                'public.backToList': 'Todas las actividades',
                'public.activityCopied': 'Enlace copiado al portapapeles',
                'public.activityCancelledDesc': 'Esta actividad ha sido cancelada. Disculpa las molestias.',
                'public.share': 'Compartir',
                'common.details': 'Detalle',
                'issues.title': 'Incidencias',
                'issues.trackingTitle': 'Seguimiento de incidencias',
                'issues.adminTitle': 'Administrador de incidencias',
                'issues.queue': 'Cola',
                'issues.queueTitle': 'Cola de incidencias',
                'issues.myIssuesDesc': 'Consulta y gestiona tus incidencias.',
                'issues.navigator': 'Navegador',
                'issues.adminDesc': 'Gestiona todas las incidencias del sistema.',
                'issues.statTotal': 'Total',
                'issues.statOpen': 'Abiertas',
                'issues.statInProgress': 'En progreso',
                'issues.statClosed': 'Cerradas',
                'issues.workflow': 'Flujo de trabajo',
                'issues.newIssue': 'Nueva incidencia',
                'issues.orderPrefix': 'Pedido',
                'issues.createIssue': 'Nueva incidencia',
                'issues.form.title': 'Título',
                'issues.form.titleRequired': 'Título *',
                'issues.form.description': 'Descripción',
                'issues.form.submit': 'Crear incidencia',
                'component.filterButton': 'Filtros',
                'component.watcher.noWatchers': 'Sin seguidores aún.',
                'component.multiSelectPlaceholder': 'Seleccionar...',
                'component.statusFilter': 'Estado',
                'common.search': 'Buscar',
                'common.clear': 'Limpiar',
                'common.loading': 'Cargando...',
                'common.noResults': 'Sin resultados',
                'common.previous': 'Anterior',
                'common.next': 'Siguiente',
                'common.save': 'Guardar',
                'common.cancel': 'Cancelar',
                'orders.confirmDelivery': 'Confirmar entrega',
                'orders.confirming': 'Confirmando...',
                'merch.drops.title': 'Drops',
            };
            return map[key] || key;
        },
        i18n: { language: 'es', changeLanguage: vi.fn() },
        ready: true,
    }),
    initReactI18next: { type: '3rdParty', init: vi.fn() },
    Trans: ({ children }: any) => children,
}))

// ── Mock react-router ────────────────────────────────────────────────
const mockOutletContext = {};
const mockUseLoaderData = vi.hoisted(() => vi.fn());
vi.mock("react-router", () => ({
    useLoaderData: mockUseLoaderData,
    useOutletContext: () => mockOutletContext,
}));

// ── Mock the env helper ──────────────────────────────────────────────
vi.mock("~/utils/env.server", () => ({
    getSiteUrl: () => "https://yambo.cabrasky.net",
}));

// ── Mock clipboard / share API ───────────────────────────────────────
const mockClipboard = vi.fn();
const mockShare = vi.fn();
Object.assign(navigator, {
    clipboard: { writeText: mockClipboard },
    share: mockShare,
});

const mockActivity = {
    id: "ACT001",
    name: "Taller de Navidad",
    description: "Un taller navideño para toda la familia",
    image: "/uploads/navidad.jpg",
    location: "Local Yambo",
    price: 5.0,
    date: "2099-12-20T10:00:00",
    endDate: "2099-12-20T18:00:00",
    status: { value: "OPEN_REGISTRATION", label: "Abierta", color: "#22c55e" },
    public: true,
    project: { id: "PRJ001", name: "Barrio" },
    manager: { id: "U0001", name: "Ana", photo: "/uploads/ana.jpg" },
};

const MOCK_SITE_URL = "https://yambo.cabrasky.net";

describe("actividad.$id — meta()", () => {
    it("returns SEO meta for a future open-registration activity", () => {
        const data = { activity: mockActivity, siteUrl: MOCK_SITE_URL };
        const result = meta({ data } as any) as any[];

        const titles = result.filter((r: any) => r.title);
        const descriptions = result.filter(
            (r: any) => r.name === "description",
        );
        const robots = result.filter((r: any) => r.name === "robots");
        const canonical = result.filter((r: any) => r.tagName === "link");
        const ogTitle = result.filter((r: any) => r.property === "og:title");
        const ogType = result.filter((r: any) => r.property === "og:type");
        const ogImage = result.filter((r: any) => r.property === "og:image");

        expect(titles[0].title).toBe("Taller de Navidad | Yambo");
        expect(descriptions[0].content).toContain("Un taller navideño");
        expect(descriptions[0].content).toContain("Local Yambo");
        expect(descriptions[0].content).toContain("5 €");
        expect(robots[0].content).toBe("index, follow");
        expect(canonical[0].href).toBe(
            "https://yambo.cabrasky.net/actividades/ACT001",
        );
        expect(ogTitle[0].content).toBe("Taller de Navidad | Yambo");
        expect(ogType[0].content).toBe("website");
        expect(ogImage[0].content).toBe("https://yambo.cabrasky.net/uploads/navidad.jpg");
    });

    it("prefixes title with [Cancelada] for cancelled activities", () => {
        const cancelled = {
            ...mockActivity,
            status: {
                value: "CANCELLED",
                label: "Cancelada",
                color: "#ef4444",
            },
            date: "2024-01-01T10:00:00",
        };
        const data = { activity: cancelled, siteUrl: MOCK_SITE_URL };
        const result = meta({ data } as any) as any[];

        const titles = result.filter((r: any) => r.title);
        const robots = result.filter((r: any) => r.name === "robots");

        expect(titles[0].title).toBe(
            "[Actividad cancelada] Taller de Navidad | Yambo",
        );
        expect(robots[0].content).toBe("noindex, follow");
    });

    it("sets noindex for past activities", () => {
        const past = {
            ...mockActivity,
            date: "2024-06-01T10:00:00",
        };
        const data = { activity: past, siteUrl: MOCK_SITE_URL };
        const result = meta({ data } as any) as any[];

        const robots = result.filter((r: any) => r.name === "robots");
        expect(robots[0].content).toBe("noindex, follow");
    });

    it("does not emit meta keywords, which search engines ignore", () => {
        const data = { activity: mockActivity, siteUrl: MOCK_SITE_URL };
        const result = meta({ data } as any) as any[];

        expect(result.filter((r: any) => r.name === "keywords")).toHaveLength(0);
    });

    it("strips Markdown from the description", () => {
        const markdown = { ...mockActivity, description: "## Taller\n\n**Ven** a pintar" };
        const data = { activity: markdown, siteUrl: MOCK_SITE_URL };
        const result = meta({ data } as any) as any[];

        const description = result.find((r: any) => r.name === "description");
        expect(description.content).toContain("Taller Ven a pintar");
    });

    it("shares the brand image when no image is set", () => {
        const noImage = { ...mockActivity, image: null };
        const data = { activity: noImage, siteUrl: MOCK_SITE_URL };
        const result = meta({ data } as any) as any[];

        const ogImage = result.filter((r: any) => r.property === "og:image");
        expect(ogImage[0].content).toBe("https://yambo.cabrasky.net/og-default.png");
    });

    it("includes JSON-LD for Event schema", () => {
        const data = { activity: mockActivity, siteUrl: MOCK_SITE_URL };
        const result = meta({ data } as any) as any[];

        const ldJson = result.filter(
            (r: any) => r["script:ld+json"],
        );
        expect(ldJson.length).toBeGreaterThanOrEqual(1);
        expect((ldJson[0] as any)["script:ld+json"]["@type"]).toBe("Event");
    });

    it("includes JSON-LD for BreadcrumbList", () => {
        const data = { activity: mockActivity, siteUrl: MOCK_SITE_URL };
        const result = meta({ data } as any) as any[];

        const ldJson = result.filter(
            (r: any) => r["script:ld+json"],
        );
        const breadcrumb = ldJson.find(
            (r: any) => r["script:ld+json"]["@type"] === "BreadcrumbList",
        );
        expect(breadcrumb).toBeDefined();
        expect(
            (breadcrumb as any)["script:ld+json"].itemListElement,
        ).toHaveLength(3);
    });
});

describe("actividad.$id — ActivityDetail component", () => {
    beforeEach(() => {
        mockUseLoaderData.mockReturnValue({
            activity: mockActivity,
            siteUrl: MOCK_SITE_URL,
            contactEmail: "yamboalcobendas@gmail.com",
            savedEmail: "",
        });
        vi.clearAllMocks();
    });

    it("renders activity name and status", () => {
        render(<ActivityDetail />);
        expect(screen.getAllByText("Taller de Navidad")[0]).toBeInTheDocument();
        expect(screen.getAllByText("Abierta", { exact: false })[0]).toBeInTheDocument();
    });

    it("renders image when present", () => {
        render(<ActivityDetail />);
        const imgs = screen.getAllByAltText("Taller de Navidad");
        expect(imgs.length).toBe(2); // desktop + mobile
        expect(imgs[0]).toHaveAttribute("src", "/uploads/navidad.jpg");
    });

    it("renders date, location, price and project", () => {
        render(<ActivityDetail />);
        expect(screen.getAllByText("Local Yambo")[0]).toBeInTheDocument();
        expect(screen.getAllByText("Barrio")[0]).toBeInTheDocument();
        expect(screen.getAllByText("Fecha")[0]).toBeInTheDocument();
        expect(screen.getAllByText("Ubicación")[0]).toBeInTheDocument();
        expect(screen.getAllByText("Precio")[0]).toBeInTheDocument();
        expect(screen.getAllByText("Proyecto")[0]).toBeInTheDocument();
    });

    it("shows CTA only for OPEN_REGISTRATION future activities", () => {
        render(<ActivityDetail />);
        const ctas = screen.getAllByText("Quiero apuntarme");
        expect(ctas.length).toBe(2); // desktop right panel + mobile floating
    });

    it("hides CTA for past activities", () => {
        mockUseLoaderData.mockReturnValue({
            activity: {
                ...mockActivity,
                date: "2024-06-01T10:00:00",
            },
            siteUrl: MOCK_SITE_URL,
            contactEmail: "yamboalcobendas@gmail.com",
            savedEmail: "",
        });

        render(<ActivityDetail />);
        expect(screen.queryByText("Quiero apuntarme")).not.toBeInTheDocument();
    });

    it("hides CTA but shows waitlist for future PLANNED activities", () => {
        mockUseLoaderData.mockReturnValue({
            activity: {
                ...mockActivity,
                status: { value: "PLANNED", label: "Planificada", color: "#3b82f6" },
            },
            siteUrl: MOCK_SITE_URL,
            contactEmail: "yamboalcobendas@gmail.com",
            savedEmail: "",
        });

        render(<ActivityDetail />);
        expect(screen.queryByText("Quiero apuntarme")).not.toBeInTheDocument();
        // Waitlist should be shown for PLANNED activities
        expect(screen.getAllByText("Avísame cuando se abra").length).toBeGreaterThanOrEqual(1);
    });

    it("renders share button and copies link to clipboard", () => {
        // Mock clipboard when share API not available
        delete (navigator as any).share;
        render(<ActivityDetail />);
        const shareBtn = screen.getAllByText("Compartir")[0];
        expect(shareBtn).toBeInTheDocument();

        fireEvent.click(shareBtn);
        expect(mockClipboard).toHaveBeenCalledWith(
            "http://localhost:3000/",
        );
    });

    it("uses Web Share API when available", () => {
        // Restore navigator.share mock
        (navigator as any).share = mockShare;
        render(<ActivityDetail />);
        const shareBtn = screen.getAllByText("Compartir")[0];
        fireEvent.click(shareBtn);
        expect(mockShare).toHaveBeenCalled();
    });

    it("shows cancelled alert and hides CTA for cancelled activities", () => {
        mockUseLoaderData.mockReturnValue({
            activity: {
                ...mockActivity,
                status: { value: "CANCELLED", label: "Cancelada", color: "#ef4444" },
                date: "2099-12-20T10:00:00",
            },
            siteUrl: MOCK_SITE_URL,
            contactEmail: "yamboalcobendas@gmail.com",
            savedEmail: "",
        });

        render(<ActivityDetail />);
        expect(screen.getAllByText("Actividad cancelada").length).toBe(2); // desktop + mobile
        expect(screen.queryByText("Quiero apuntarme")).not.toBeInTheDocument();
    });
});
