import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FilterableTable } from './FilterableTable';
import type { FilterableTableProps, FilterableColumn } from './FilterableTable';

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
                'common.filter': 'Filtros',
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

vi.mock('~/components/common/DataTable', () => ({
    DataTable: () => <div data-testid="data-table" />,
}));

vi.mock('~/components/common/FiltersSection', () => ({
    FiltersSection: () => <div data-testid="filters-section" />,
}));

vi.mock('~/components/common/Pagination', () => ({
    Pagination: () => <div data-testid="pagination" />,
}));

vi.mock('~/components/common/LoadingSpinner', () => ({
    LoadingSpinner: () => <div data-testid="loading-spinner" />,
}));

vi.mock('~/components/common/ErrorMessage', () => ({
    ErrorMessage: () => <div data-testid="error-message" />,
}));

vi.mock('~/components/common/forms/ButtonComponent', () => ({
    default: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

vi.mock('@fortawesome/react-fontawesome', () => ({
    FontAwesomeIcon: () => <span />,
}));

type TestItem = { id: string; name: string };

const columns: FilterableColumn<TestItem>[] = [
    {
        key: 'name',
        header: 'Name',
        filter: { enabled: true, type: 'text' },
    },
];

const data: TestItem[] = [{ id: '1', name: 'Item 1' }];

function renderTable(overrideProps?: Partial<FilterableTableProps<TestItem>>) {
    return render(
        <FilterableTable<TestItem>
            columns={columns}
            keyField="id"
            data={data}
            {...overrideProps}
        />
    );
}

describe('FilterableTable', () => {
    const originalInnerWidth = window.innerWidth;

    afterEach(() => {
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: originalInnerWidth,
        });
    });

    describe('mobile filter collapse', () => {
        it('collapses filters by default on narrow viewport (< 768px)', () => {
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 375,
            });
            renderTable();
            expect(screen.queryByTestId('filters-section')).not.toBeInTheDocument();
        });

        it('expands filters by default on wide viewport (>= 768px)', () => {
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 1280,
            });
            renderTable();
            expect(screen.getByTestId('filters-section')).toBeInTheDocument();
        });

        it('collapses the filter panel when the toggle button is clicked on wide viewport', () => {
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 1280,
            });
            renderTable();
            expect(screen.getByTestId('filters-section')).toBeInTheDocument();
            fireEvent.click(screen.getByRole('button', { name: /filtros/i }));
            expect(screen.queryByTestId('filters-section')).not.toBeInTheDocument();
        });

        it('expands the filter panel when the toggle button is clicked on narrow viewport', () => {
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 375,
            });
            renderTable();
            expect(screen.queryByTestId('filters-section')).not.toBeInTheDocument();
            fireEvent.click(screen.getByRole('button', { name: /filtros/i }));
            expect(screen.getByTestId('filters-section')).toBeInTheDocument();
        });
    });
});
