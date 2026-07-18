import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AdminIssuesPage from "./admin";
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
const getAllIssuesMock = vi.fn();

vi.mock("react-router", () => ({
    useNavigate: () => useNavigateMock,
}));

vi.mock("~/components/common/RequirePermission", () => ({
    RequirePermission: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("~/components/common/forms/ButtonComponent", () => ({
    default: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
        <button onClick={onClick}>{children}</button>
    ),
}));

vi.mock("~/components/common/StatCard", () => ({
    StatCard: ({ label, value }: { label: string; value: number }) => (
        <div>{`${label}:${value}`}</div>
    ),
}));

vi.mock("~/components/issues", () => ({
    IssueStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock("~/components/common/StatusWorkflow", () => ({
    StatusWorkflow: () => <div>workflow</div>,
}));

vi.mock("~/components/common/ViewTabs", () => ({
    ViewTabs: () => <div>tabs</div>,
    useViewTab: () => ({ activeTab: "actual", setActiveTab: vi.fn() }),
}));

vi.mock("~/components/common/FilterableTable", () => ({
    FilterableTable: ({ serverSide }: { serverSide: { fetchData: (args: any) => Promise<any> } }) => {
        void serverSide.fetchData({ page: 0, size: 10, filters: {} });
        return <div>admin-issues-table</div>;
    },
}));

vi.mock("~/services/issueService", () => ({
    issueService: {
        getAllIssues: (...args: any[]) => getAllIssuesMock(...args),
    },
}));

describe("Admin Issues Route", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getAllIssuesMock.mockResolvedValue({
            content: [
                {
                    id: "ISS-ADMIN-1",
                    title: "Paquete dañado",
                    description: "Caja rota",
                    status: IssueStatus.IN_PROGRESS,
                    orderId: "200",
                    customerName: "Carlos",
                    productName: "Sudadera",
                    createdAt: "2026-02-01T10:00:00Z",
                },
            ],
            page: { totalElements: 1, totalPages: 1, number: 0, size: 10 },
        });
    });

    it("renders admin workflow and loads issues", async () => {
        render(<AdminIssuesPage />);

        expect(screen.getByText("Administrador de incidencias")).toBeInTheDocument();
        expect(screen.getByText("workflow")).toBeInTheDocument();
        expect(screen.getByText("admin-issues-table")).toBeInTheDocument();

        await waitFor(() => {
            expect(getAllIssuesMock).toHaveBeenCalled();
        });
    });
});