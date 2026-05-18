import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReportsPage, { meta } from './index';
import { useReportData } from '~/hooks/useReportData';

vi.mock('~/hooks/useReportData', () => ({
    useReportData: vi.fn(),
}));

vi.mock('@fortawesome/react-fontawesome', () => ({
    FontAwesomeIcon: () => null,
}));

vi.mock('~/components/reports/ReportCharts', () => ({
    MetricCard: ({ title }: { title: string }) => <div>{title}</div>,
    ChartCard: ({ title, children }: { title: string; children: React.ReactNode }) => (
        <section>
            <h3>{title}</h3>
            {children}
        </section>
    ),
    DateRangePicker: ({ onStartDateChange, onEndDateChange }: { onStartDateChange: (v: string) => void; onEndDateChange: (v: string) => void }) => (
        <div>
            <button onClick={() => onStartDateChange('2026-05-01')}>set-start</button>
            <button onClick={() => onEndDateChange('2026-05-18')}>set-end</button>
        </div>
    ),
    ReportLineChart: () => <div>line-chart</div>,
    ReportBarChart: () => <div>bar-chart</div>,
    ReportDoughnutChart: () => <div>doughnut-chart</div>,
}));

const reportData = {
    orders: {
        totalOrders: 10,
        totalRevenue: 100,
        averageOrderValue: 10,
        averageFulfillmentHours: null,
        ordersByStatus: {},
        ordersOverTime: [],
        revenueOverTime: [],
    },
    users: {
        totalUsers: 15,
        newRegistrations: 2,
        activeUsers: 5,
        totalLogins: 20,
        engagementRate: 33,
        registrationsOverTime: [],
        activeUsersOverTime: [],
    },
    issues: {
        totalIssues: 3,
        openIssues: 1,
        closedIssues: 2,
        averageResolutionHours: null,
        issuesByStatus: {},
        issuesOverTime: [],
    },
    products: {
        totalProductsSold: 7,
        uniqueProductsSold: 4,
        totalProductRevenue: 200,
        topProductsByQuantity: [],
        topProductsByRevenue: [],
        salesByFamily: [],
        productSalesOverTime: [],
        productRevenueOverTime: [],
        productsByStatus: {},
        totalViews: null,
        uniqueViewedProducts: null,
        conversionFunnel: null,
    },
};

describe('reports route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns expected meta', () => {
        expect(meta({} as any)).toEqual([
            { title: 'Yambo - Informes' },
            { name: 'description', content: 'Informes y analíticas avanzadas' },
        ]);
    });

    it('renders loading state', () => {
        vi.mocked(useReportData).mockReturnValue({
            data: null,
            loading: true,
            error: null,
            refetch: vi.fn(),
            startDate: '',
            endDate: '',
            setStartDate: vi.fn(),
            setEndDate: vi.fn(),
        } as any);

        render(<ReportsPage />);
        expect(screen.getByText('Cargando informes...')).toBeInTheDocument();
    });

    it('renders error state and triggers retry', () => {
        const refetch = vi.fn();
        vi.mocked(useReportData).mockReturnValue({
            data: null,
            loading: false,
            error: 'boom',
            refetch,
            startDate: '',
            endDate: '',
            setStartDate: vi.fn(),
            setEndDate: vi.fn(),
        } as any);

        render(<ReportsPage />);
        fireEvent.click(screen.getByText('Reintentar'));
        expect(refetch).toHaveBeenCalled();
    });

    it('renders empty-data placeholders when analytics arrays are empty', () => {
        const setStartDate = vi.fn();
        const setEndDate = vi.fn();

        vi.mocked(useReportData).mockReturnValue({
            data: reportData,
            loading: false,
            error: null,
            refetch: vi.fn(),
            startDate: '2026-05-01',
            endDate: '2026-05-18',
            setStartDate,
            setEndDate,
        } as any);

        render(<ReportsPage />);

        expect(screen.getByText('Total Pedidos')).toBeInTheDocument();
        expect(screen.getAllByText('Sin datos en este periodo').length).toBeGreaterThan(0);

        fireEvent.click(screen.getByText('set-start'));
        fireEvent.click(screen.getByText('set-end'));
        expect(setStartDate).toHaveBeenCalled();
        expect(setEndDate).toHaveBeenCalled();
    });

    it('renders populated analytics sections when data arrays are present', () => {
        vi.mocked(useReportData).mockReturnValue({
            data: {
                ...reportData,
                orders: {
                    ...reportData.orders,
                    ordersOverTime: [{ date: '2026-05-01', value: 2 }],
                    revenueOverTime: [{ date: '2026-05-01', value: 20 }],
                    ordersByStatus: { PENDING_PAYMENT: 1 },
                },
                users: {
                    ...reportData.users,
                    registrationsOverTime: [{ date: '2026-05-01', value: 1 }],
                    activeUsersOverTime: [{ date: '2026-05-01', value: 2 }],
                },
                issues: {
                    ...reportData.issues,
                    issuesOverTime: [{ date: '2026-05-01', value: 1 }],
                    issuesByStatus: { OPEN: 1 },
                },
                products: {
                    ...reportData.products,
                    productSalesOverTime: [{ date: '2026-05-01', value: 3 }],
                    productRevenueOverTime: [{ date: '2026-05-01', value: 30 }],
                    topProductsByQuantity: [{ productId: 'p1', productName: 'Prod 1', quantity: 3, revenue: 30 }],
                    topProductsByRevenue: [{ productId: 'p1', productName: 'Prod 1', quantity: 3, revenue: 30 }],
                    salesByFamily: [{ familyId: 'f1', familyName: 'Drop Uno', quantity: 3, revenue: 30 }],
                    productsByStatus: { PENDING_PRODUCTS: 1 },
                    conversionFunnel: [
                        { productId: 'p1', productName: 'Prod 1', views: 100, purchases: 12, conversionRate: 12 },
                        { productId: 'p2', productName: 'Prod 2', views: 100, purchases: 5, conversionRate: 5 },
                        { productId: 'p3', productName: 'Prod 3', views: 100, purchases: 2, conversionRate: 2 },
                    ],
                },
            },
            loading: false,
            error: null,
            refetch: vi.fn(),
            startDate: '2026-05-01',
            endDate: '2026-05-18',
            setStartDate: vi.fn(),
            setEndDate: vi.fn(),
        } as any);

        render(<ReportsPage />);

        expect(screen.getByText('Drop Uno')).toBeInTheDocument();
        expect(screen.getByText('Prod 1')).toBeInTheDocument();
        expect(screen.getByText('12%')).toBeInTheDocument();
        expect(screen.getByText('5%')).toBeInTheDocument();
        expect(screen.getByText('2%')).toBeInTheDocument();
        expect(screen.queryByText('Sin datos en este periodo')).not.toBeInTheDocument();
    });
});
