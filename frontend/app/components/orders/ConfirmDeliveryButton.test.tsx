import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfirmDeliveryButton } from './ConfirmDeliveryButton';
import { orderService } from '~/services/orderService';
import toast from 'react-hot-toast';
import type { Order } from '~/types/order';

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
                'common.loading': 'Confirmando...',
                'common.noResults': 'Sin resultados',
                'common.previous': 'Anterior',
                'common.next': 'Siguiente',
                'common.save': 'Guardar',
                'common.cancel': 'Cancelar',
                'orders.confirmDelivery': 'Confirmar entrega',
                'orders.confirming': 'Confirmando...',
                'orders.deliveryConfirmed': 'Entrega confirmada correctamente.',
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

vi.mock('~/services/orderService', () => ({
    orderService: {
        confirmProductDelivery: vi.fn(),
    },
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

const mockOrder: Order = {
    id: 'ORD001',
    user: { id: 'U1', name: 'Test User', email: 'test@example.com' },
    status: 'PENDING_PAYMENT',
    createdAt: '2024-01-01T00:00:00Z',
    hasOpenIssues: false,
    products: [],
};

describe('ConfirmDeliveryButton', () => {
    const mockOnConfirmed = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the confirm delivery button', () => {
        render(
            <ConfirmDeliveryButton
                orderId="ORD001"
                onConfirmed={mockOnConfirmed}
            />
        );
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
        expect(button).toHaveTextContent('Confirmar entrega');
        expect(button).not.toBeDisabled();
    });

    it('shows confirming state and disables button while waiting', async () => {
        let resolvePromise: (value: Order) => void = () => {};
        vi.mocked(orderService.confirmProductDelivery).mockReturnValue(
            new Promise<Order>((resolve) => {
                resolvePromise = resolve;
            })
        );

        render(
            <ConfirmDeliveryButton
                orderId="ORD001"
                onConfirmed={mockOnConfirmed}
            />
        );

        fireEvent.click(screen.getByRole('button'));

        expect(screen.getByRole('button')).toHaveTextContent('Confirmando...');
        expect(screen.getByRole('button')).toBeDisabled();

        // Resolve promise to clean up
        await act(async () => {
            resolvePromise(mockOrder);
        });
    });

    it('calls onConfirmed and shows success toast on successful delivery', async () => {
        vi.mocked(orderService.confirmProductDelivery).mockResolvedValue(mockOrder);

        render(
            <ConfirmDeliveryButton
                orderId="ORD001"
                onConfirmed={mockOnConfirmed}
            />
        );

        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => {
            expect(orderService.confirmProductDelivery).toHaveBeenCalledWith('ORD001');
            expect(mockOnConfirmed).toHaveBeenCalledWith(mockOrder);
            expect(toast.success).toHaveBeenCalledWith('Entrega confirmada correctamente.');
        });

        expect(screen.getByRole('button')).not.toBeDisabled();
        expect(screen.getByRole('button')).toHaveTextContent('Confirmar entrega');
    });

    it('shows error toast and re-enables button on failure', async () => {
        vi.mocked(orderService.confirmProductDelivery).mockRejectedValue(new Error('Network error'));

        render(
            <ConfirmDeliveryButton
                orderId="ORD001"
                onConfirmed={mockOnConfirmed}
            />
        );

        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalled();
            expect(mockOnConfirmed).not.toHaveBeenCalled();
        });

        expect(screen.getByRole('button')).not.toBeDisabled();
        expect(screen.getByRole('button')).toHaveTextContent('Confirmar entrega');
    });
});
