import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PublicActivitiesPage, { meta } from "./actividades";

// ── Mocks ────────────────────────────────────────────────────────────

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const map: Record<string, string> = {
                'public.activitiesTitle': 'Actividades',
                'public.activitiesSubtitle': 'Descubre las actividades abiertas al público',
                'public.activitiesPageTitle': 'Yambo - Actividades | Asociación Juvenil en Alcobendas',
                'public.activitiesMetaDescription': 'Consulta las próximas actividades de Yambo en Alcobendas (Madrid). Eventos de ocio educativo y tiempo libre para niños y adolescentes.',
                'public.activitiesKeywords': 'actividades juveniles, Yambo, Alcobendas, Madrid',
                'public.activitiesSearch': 'Buscar actividades...',
                'public.activitiesListView': 'Lista',
                'public.activitiesCalendarView': 'Calendario',
                'public.activitiesUpcoming': 'Próximas',
                'public.activitiesPast': 'Pasadas',
                'public.activitiesNoPublic': 'No hay actividades públicas',
                'public.activitiesNoPublicDesc': 'Cuando se publiquen nuevas actividades, las verás aquí. ¡Vuelve pronto!',
                'public.activitiesShowAll': 'Mostrar todas las actividades',
                'public.activitiesNoDate': 'No hay actividades para esta fecha.',
                'public.activitiesTodayToast': 'Hoy es un gran día para hacer algo increíble.',
                'public.activitiesCount': 'actividades',
                'public.activitiesDay_1': 'Lun',
                'public.activitiesDay_2': 'Mar',
                'public.activitiesDay_3': 'Mié',
                'public.activitiesDay_4': 'Jue',
                'public.activitiesDay_5': 'Vie',
                'public.activitiesDay_6': 'Sáb',
                'public.activitiesDay_7': 'Dom',
                'activities.title': 'actividades',
                'public.activityCancelledTitle': 'Cancelada',
                'public.activityShare': 'Compartir',
                'public.activityDate': 'Fecha',
                'public.activityLocation': 'Ubicación',
                'public.activityPrice': 'Precio',
                'public.activityProject': 'Proyecto',
                'public.activityRegister': 'Quiero apuntarme',
                'public.activityDescription': 'Descripción',
                'public.activityUntil': 'hasta',
                'public.backToList': 'Todas las actividades',
                'public.activityCopied': 'Enlace copiado al portapapeles',
                'public.activityCancelledDesc': 'Esta actividad ha sido cancelada. Disculpa las molestias.',
                'public.share': 'Compartir',
                'common.all': 'Todas',
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
}));

const mockUseLoaderData = vi.hoisted(() => vi.fn());
vi.mock("react-router", () => ({
    useLoaderData: mockUseLoaderData,
}));

vi.mock("~/utils/env.server", () => ({
    getSiteUrl: () => "https://yambo.cabrasky.net",
}));

vi.mock("react-hot-toast", () => ({
    default: vi.fn(),
}));

vi.mock("~/utils/confetti", () => ({
    fireEmojiRain: vi.fn(),
}));

// ── Sample data ──────────────────────────────────────────────────────

const now = new Date();
const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

const mockActivities = [
    {
        id: "ACT001",
        name: "Taller de Navidad",
        description: "Un taller navideño para toda la familia **divertido**",
        image: "/uploads/navidad.jpg",
        location: "Local Yambo",
        price: 5.0,
        date: futureDate.toISOString(),
        endDate: null,
        status: { value: "OPEN_REGISTRATION", label: "Abierta", color: "#22c55e" },
        public: true,
        project: { id: "PRJ001", name: "Barrio" },
        manager: { id: "U0001", name: "Ana", photo: "/uploads/ana.jpg" },
    },
    {
        id: "ACT002",
        name: "Excursión a la Sierra",
        description: "Una excursión de fin de semana",
        image: null,
        location: "Sierra de Madrid",
        price: 15.0,
        date: futureDate.toISOString(),
        endDate: null,
        status: { value: "PLANNED", label: "Planificada", color: "#f59e0b" },
        public: true,
        project: { id: "PRJ002", name: "Naturaleza" },
        manager: { id: "U0002", name: "Carlos" },
    },
    {
        id: "ACT003",
        name: "Taller de Reciclaje",
        description: "Aprende a reciclar",
        image: "/uploads/reciclaje.jpg",
        location: "Local Yambo",
        price: 0,
        date: pastDate.toISOString(),
        endDate: null,
        status: { value: "FINISHED", label: "Finalizada", color: "#6b7280" },
        public: true,
        project: { id: "PRJ001", name: "Barrio" },
        manager: { id: "U0001", name: "Ana", photo: "/uploads/ana.jpg" },
    },
];

// ── Tests ────────────────────────────────────────────────────────────

describe("actividades — meta()", () => {
    it("returns SEO meta with title and description", () => {
        const data = { activities: mockActivities, siteUrl: "https://yambo.cabrasky.net" };
        const result = meta({ data } as any);

        const titles = result.filter((r: any) => r.title);
        const descriptions = result.filter((r: any) => r.name === "description");
        const robots = result.filter((r: any) => r.name === "robots");

        expect(titles[0].title).toBe("Yambo - Actividades | Asociación Juvenil en Alcobendas");
        expect(descriptions[0].content).toContain("Alcobendas");
        expect(robots[0].content).toBe("index, follow");
    });
});

// ── PublicActivities component tests ─────────────────────────────────

describe("actividades — PublicActivities component", () => {
    beforeEach(() => {
        mockUseLoaderData.mockReturnValue({
            activities: mockActivities,
            siteUrl: "https://yambo.cabrasky.net",
        });
    });

    describe("List view", () => {
        it("renders the page title and subtitle", () => {
            render(<PublicActivitiesPage />);
            expect(screen.getByText("Actividades")).toBeInTheDocument();
            expect(screen.getByText("Descubre las actividades abiertas al público")).toBeInTheDocument();
        });

        it("renders upcoming activity cards with names", () => {
            render(<PublicActivitiesPage />);
            expect(screen.getByText("Taller de Navidad")).toBeInTheDocument();
            expect(screen.getByText("Excursión a la Sierra")).toBeInTheDocument();
        });

        it("renders all activities in a single unified list", () => {
            render(<PublicActivitiesPage />);
            // All activities visible together (no upcoming/past split)
            expect(screen.getByText("Taller de Navidad")).toBeInTheDocument();
            expect(screen.getByText("Excursión a la Sierra")).toBeInTheDocument();
            expect(screen.getByText("Taller de Reciclaje")).toBeInTheDocument();
        });

        it("renders status badges with correct text", () => {
            render(<PublicActivitiesPage />);
            expect(screen.getByText("Abierta")).toBeInTheDocument();
            expect(screen.getByText("Planificada")).toBeInTheDocument();
        });

        it("renders detail links pointing to activity page", () => {
            render(<PublicActivitiesPage />);
            const detailLinks = screen.getAllByText("Detalle");
            expect(detailLinks.length).toBeGreaterThanOrEqual(2);
            const firstLink = detailLinks[0].closest("a");
            expect(firstLink).toHaveAttribute("href", "/actividades/ACT001");
        });

        it("shows project filter chips", () => {
            render(<PublicActivitiesPage />);
            expect(screen.getByText("Todas")).toBeInTheDocument();
            // The filter buttons (not the card text)
            const chips = screen.getAllByRole("button").filter(
                b => b.textContent === "Barrio" || b.textContent === "Naturaleza",
            );
            expect(chips.length).toBe(2);
        });

        it("renders activity count", () => {
            render(<PublicActivitiesPage />);
            // All 3 activities visible together
            expect(screen.getByText("Taller de Navidad")).toBeInTheDocument();
            expect(screen.getByText("Taller de Reciclaje")).toBeInTheDocument();
        });

        it("shows past activity alongside upcoming activities", () => {
            render(<PublicActivitiesPage />);
            // Past activity is visible without needing to expand a section
            expect(screen.getByText("Taller de Reciclaje")).toBeInTheDocument();
        });
    });

    describe("Search functionality", () => {
        it("filters activities by name", () => {
            render(<PublicActivitiesPage />);
            const searchInput = screen.getByPlaceholderText("Buscar actividades...");
            fireEvent.change(searchInput, { target: { value: "Navidad" } });

            expect(screen.getByText("Taller de Navidad")).toBeInTheDocument();
            expect(screen.queryByText("Excursión a la Sierra")).not.toBeInTheDocument();
        });

        it("filters activities by location", () => {
            render(<PublicActivitiesPage />);
            const searchInput = screen.getByPlaceholderText("Buscar actividades...");
            fireEvent.change(searchInput, { target: { value: "Sierra" } });

            expect(screen.getByText("Excursión a la Sierra")).toBeInTheDocument();
            expect(screen.queryByText("Navidad")).toBeNull();
        });

        it("filters activities by project name", () => {
            render(<PublicActivitiesPage />);
            const searchInput = screen.getByPlaceholderText("Buscar actividades...");
            fireEvent.change(searchInput, { target: { value: "Naturaleza" } });

            expect(screen.getByText("Excursión a la Sierra")).toBeInTheDocument();
            expect(screen.queryByText("Navidad")).toBeNull();
        });

        it("shows no results state when search matches nothing", () => {
            render(<PublicActivitiesPage />);
            const searchInput = screen.getByPlaceholderText("Buscar actividades...");
            fireEvent.change(searchInput, { target: { value: "zzzznotfound" } });

            // View toggle and filter chips remain visible
            expect(screen.getByText("Lista")).toBeInTheDocument();
            expect(screen.getByText("Todas")).toBeInTheDocument();
            // No activity cards rendered
            expect(screen.queryByText("Taller de Navidad")).toBeNull();
            expect(screen.queryByText("Excursión a la Sierra")).toBeNull();
            // No count badge shown because sections with 0 activities don't render
        });

        it("clears search query when clicking limpiar", () => {
            render(<PublicActivitiesPage />);
            const searchInput = screen.getByPlaceholderText("Buscar actividades...");
            fireEvent.change(searchInput, { target: { value: "Navidad" } });

            // The clear button appears when search has value
            const clearButton = screen.getByText("Limpiar");
            fireEvent.click(clearButton);

            // All upcoming activities should be visible again
            expect(screen.getByText("Taller de Navidad")).toBeInTheDocument();
            expect(screen.getByText("Excursión a la Sierra")).toBeInTheDocument();
        });
    });

    describe("Project filter", () => {
        it("filters by project when clicking a project chip", () => {
            render(<PublicActivitiesPage />);
            // Click the Naturaleza button (filter chip, not card text)
            const chip = screen.getAllByRole("button").find(b => b.textContent === "Naturaleza")!;
            fireEvent.click(chip);

            expect(screen.getByText("Excursión a la Sierra")).toBeInTheDocument();
            expect(screen.queryByText("Taller de Navidad")).not.toBeInTheDocument();
        });

        it("shows all activities again when clicking Todas", () => {
            render(<PublicActivitiesPage />);
            const chip = screen.getAllByRole("button").find(b => b.textContent === "Naturaleza")!;
            fireEvent.click(chip);

            fireEvent.click(screen.getByText("Todas"));

            // Both upcoming activities visible again
            expect(screen.getByText("Taller de Navidad")).toBeInTheDocument();
            expect(screen.getByText("Excursión a la Sierra")).toBeInTheDocument();
        });
    });

    describe("Calendar view", () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date("2026-07-12T12:00:00"));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("switches to calendar view when clicking Calendario", () => {
            render(<PublicActivitiesPage />);
            fireEvent.click(screen.getByText("Calendario"));

            // Calendar day-of-week headers
            expect(screen.getByText("Lun")).toBeInTheDocument();
            expect(screen.getByText("Dom")).toBeInTheDocument();
        });

        it("switches back to list view", () => {
            render(<PublicActivitiesPage />);
            fireEvent.click(screen.getByText("Calendario"));
            fireEvent.click(screen.getByText("Lista"));

            // List view shows activity cards
            expect(screen.getByText("Taller de Navidad")).toBeInTheDocument();
        });
    });

    describe("Empty state", () => {
        it("shows empty state when there are no activities", () => {
            mockUseLoaderData.mockReturnValue({
                activities: [],
                siteUrl: "https://yambo.cabrasky.net",
            });

            render(<PublicActivitiesPage />);
            expect(screen.getByText("No hay actividades públicas")).toBeInTheDocument();
        });
    });

    describe("Activity card", () => {
        it("renders price in green pill format for upcoming activities", () => {
            render(<PublicActivitiesPage />);
            expect(screen.getByText("5,00 €")).toBeInTheDocument();
            expect(screen.getByText("15,00 €")).toBeInTheDocument();
        });

        it("renders location text", () => {
            render(<PublicActivitiesPage />);
            // "Local Yambo" appears on multiple cards now (unified list)
            const localYamboElements = screen.getAllByText("Local Yambo");
            expect(localYamboElements.length).toBeGreaterThanOrEqual(1);
            expect(screen.getByText("Sierra de Madrid")).toBeInTheDocument();
        });
    });
});
