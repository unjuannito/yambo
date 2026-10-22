import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import toast from 'react-hot-toast';
import { IssueForm } from './IssueForm';
import { issueService } from '~/services/issueService';

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
                'issues.title': 'Título',
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
                'issues.createIssue': 'Reportar incidencia',
                'issues.form.title': 'Título',
                'issues.form.titleRequired': 'Título *',
                'issues.form.description': 'Descripción',
                'issues.form.submit': 'Crear incidencia',
                'issues.description': 'Descripción',
                'issues.created': 'Incidencia creada',
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

vi.mock('~/services/issueService', () => ({
    issueService: {
        createIssue: vi.fn(),
    },
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

describe('IssueForm', () => {
    const onSuccess = vi.fn();
    const onCancel = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows success toast when creating an issue', async () => {
        vi.mocked(issueService.createIssue).mockResolvedValue({} as any);

        render(
            <IssueForm
                orderedProducts={[{ id: 'prod-1', name: 'Producto 1' }]}
                onSuccess={onSuccess}
                onCancel={onCancel}
            />
        );

        fireEvent.change(screen.getByLabelText('Título *'), {
            target: { value: 'Incidencia de prueba' },
        });
        fireEvent.change(screen.getByLabelText('Descripción *'), {
            target: { value: 'Descripción de prueba' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Reportar incidencia' }));

        await waitFor(() => {
            expect(issueService.createIssue).toHaveBeenCalledWith({
                orderedProductIds: ['prod-1'],
                title: 'Incidencia de prueba',
                description: 'Descripción de prueba',
            });
        });

        expect(toast.success).toHaveBeenCalledWith('Incidencia creada');
        expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('shows error toast when issue creation fails', async () => {
        vi.mocked(issueService.createIssue).mockRejectedValue(new Error('Error al crear'));

        render(
            <IssueForm
                orderedProducts={[{ id: 'prod-1', name: 'Producto 1' }]}
                onSuccess={onSuccess}
                onCancel={onCancel}
            />
        );

        fireEvent.change(screen.getByLabelText('Título *'), {
            target: { value: 'Incidencia de prueba' },
        });
        fireEvent.change(screen.getByLabelText('Descripción *'), {
            target: { value: 'Descripción de prueba' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Reportar incidencia' }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Error al crear');
        });
        expect(onSuccess).not.toHaveBeenCalled();
    });
});
