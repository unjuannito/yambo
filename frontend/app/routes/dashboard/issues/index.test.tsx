import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import IssuesPage from "./index";
import { IssueStatus } from "~/types/issueType";

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const map: Record<string, string> = {
                'public.activitiesTitle': 'Actividades',
                'public.activitiesSubtitle': 'Descubre las actividades abiertas al público.',
                'public.activitiesPageTitle': 'Yambo - Actividades | Asociación Juvenil en Alcobendas',
                'public.upcomingSection': 'Próximas',
                'public.pastSection': 'Pasadas',
                'public.searchPlaceholder': 'Buscar actividades...',
                'public.listView': 'Lista',
                'public.calendarView': 'Calendario',
                'public.filterAllProjects': 'Todas',
                'public.viewDetail': 'Detalle',
                'public.seeMore': 'Ver más',
                'public.activityNights': 'noches',
                'public.activityNight': 'noche',
                'public.activityPrice': '{price} €',
                'public.activitiesCount': '{count} actividades',
                'public.activityCancelledTitle': '[Cancelada]',
                'public.activityShare': 'Compartir',
                'public.share': 'Compartir',
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

const useNavigateMock = vi.fn();
const getMyIssuesMock = vi.fn();

vi.mock("react-router", () => ({
    useNavigate: () => useNavigateMock,
}));

vi.mock("~/components/common/forms/ButtonComponent", () => ({
    default: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
        <button onClick={onClick}>{children}</button>
    ),
}));

vi.mock("~/components/issues", () => ({
    IssueStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock("~/components/common/FilterableTable", () => ({
    FilterableTable: ({ serverSide }: { serverSide: { fetchData: (args: any) => Promise<any> } }) => {
        void serverSide.fetchData({ page: 0, size: 10, filters: {} });
        return <div>issues-table</div>;
    },
}));

vi.mock("~/services/issueService", () => ({
    issueService: {
        getMyIssues: (...args: any[]) => getMyIssuesMock(...args),
    },
}));

describe("User Issues Route", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getMyIssuesMock.mockResolvedValue({
            content: [
                {
                    id: "ISS-10",
                    title: "Retraso",
                    description: "Paquete tardio",
                    status: IssueStatus.OPEN,
                    orderId: "100",
                    productName: "Camiseta",
                    createdAt: "2026-01-01T10:00:00Z",
                },
            ],
            page: { totalElements: 1, totalPages: 1, number: 0, size: 10 },
        });
    });

    it("renders heading and loads issue data", async () => {
        render(<IssuesPage />);

        expect(screen.getByText("Incidencias")).toBeInTheDocument();
        expect(screen.getByText("issues-table")).toBeInTheDocument();

        await waitFor(() => {
            expect(getMyIssuesMock).toHaveBeenCalled();
        });
    });
});