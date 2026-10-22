import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CreateIssueModal } from './CreateIssueModal';
import type { IssueReportWindowModel } from '~/types/issueType';

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
                'orders.orderNumber': 'Pedido',
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
                'issues.selectProducts': 'Selecciona uno o varios productos de este pedido para asociarlos a la incidencia.',
            };
            return map[key] || key;
        },
        i18n: { language: 'es', changeLanguage: vi.fn() },
        ready: true,
    }),
    initReactI18next: { type: '3rdParty', init: vi.fn() },
    Trans: ({ children }: any) => children,
}));

vi.mock('./IssueForm', () => ({
    IssueForm: vi.fn(({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) => (
        <div data-testid="issue-form">
            <button onClick={onSuccess}>submit</button>
            <button onClick={onCancel}>cancel</button>
        </div>
    )),
}));

vi.mock('~/components/common/Modal', () => ({
    Modal: ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) =>
        isOpen ? (
            <div data-testid="modal">
                <h2>{title}</h2>
                <button onClick={onClose}>close-modal</button>
                {children}
            </div>
        ) : null,
}));

const sampleIssueWindow: IssueReportWindowModel = {
    orderId: 'ORD123',
    orderedProducts: [
        { id: 'prod-1', name: 'T-Shirt', quantity: 1, unitPrice: 19.99 },
        { id: 'prod-2', name: 'Hat', quantity: 2, unitPrice: 9.99 },
    ],
    initialSelectedOrderedProductIds: ['prod-1'],
};

describe('CreateIssueModal', () => {
    it('renders nothing when issueWindow is null', () => {
        const { container } = render(
            <CreateIssueModal issueWindow={null} onClose={vi.fn()} onSuccess={vi.fn()} />
        );
        expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
        expect(container.firstChild).toBeNull();
    });

    it('renders the modal with the order title when issueWindow is set', () => {
        render(
            <CreateIssueModal issueWindow={sampleIssueWindow} onClose={vi.fn()} onSuccess={vi.fn()} />
        );
        expect(screen.getByTestId('modal')).toBeInTheDocument();
        expect(screen.getByText('Nueva incidencia · Pedido #ORD123')).toBeInTheDocument();
    });

    it('renders the hint text and IssueForm when issueWindow is set', () => {
        render(
            <CreateIssueModal issueWindow={sampleIssueWindow} onClose={vi.fn()} onSuccess={vi.fn()} />
        );
        expect(screen.getByText('Selecciona uno o varios productos de este pedido para asociarlos a la incidencia.')).toBeInTheDocument();
        expect(screen.getByTestId('issue-form')).toBeInTheDocument();
    });

    it('calls onClose when the modal close button is clicked', () => {
        const onClose = vi.fn();
        render(
            <CreateIssueModal issueWindow={sampleIssueWindow} onClose={onClose} onSuccess={vi.fn()} />
        );
        fireEvent.click(screen.getByText('close-modal'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when IssueForm calls onCancel', () => {
        const onClose = vi.fn();
        render(
            <CreateIssueModal issueWindow={sampleIssueWindow} onClose={onClose} onSuccess={vi.fn()} />
        );
        fireEvent.click(screen.getByText('cancel'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onSuccess when IssueForm calls onSuccess', () => {
        const onSuccess = vi.fn();
        render(
            <CreateIssueModal issueWindow={sampleIssueWindow} onClose={vi.fn()} onSuccess={onSuccess} />
        );
        fireEvent.click(screen.getByText('submit'));
        expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('passes orderedProducts and initialSelectedOrderedProductIds to IssueForm', async () => {
        const { IssueForm } = await import('./IssueForm');
        render(
            <CreateIssueModal issueWindow={sampleIssueWindow} onClose={vi.fn()} onSuccess={vi.fn()} />
        );
        const lastProps = vi.mocked(IssueForm).mock.lastCall?.[0];
        expect(lastProps?.orderedProducts).toEqual(sampleIssueWindow.orderedProducts);
        expect(lastProps?.initialSelectedOrderedProductIds).toEqual(['prod-1']);
    });
});
