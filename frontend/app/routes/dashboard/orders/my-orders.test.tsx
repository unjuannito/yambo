import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import MyOrdersPage, { meta } from './my-orders';
import { orderService } from '~/services/orderService';
import { issueService } from '~/services/issueService';
import { productService } from '~/services/productService';
import { familyProductService } from '~/services/familyProductService';
import { useAuth } from '~/hooks/useAuth';
import { CreateIssueModal } from '~/components/issues';
import toast from 'react-hot-toast';
import type { Order } from '~/types/order';

vi.mock('~/hooks/useAuth', () => ({
    useAuth: vi.fn(),
}));

vi.mock('~/services/orderService', () => ({
    orderService: {
        getMyOrders: vi.fn(),
        cancelMyOrder: vi.fn(),
        uploadReceipt: vi.fn(),
    },
}));

vi.mock('~/services/issueService', () => ({
    issueService: {
        getIssuesByOrder: vi.fn(),
    },
}));

vi.mock('~/services/productService', () => ({
    productService: {
        getAllProducts: vi.fn(),
    },
}));

vi.mock('~/services/familyProductService', () => ({
    familyProductService: {
        listFamilyProducts: vi.fn(),
    },
}));

vi.mock('~/components/common/StatusWorkflow', () => ({
    StatusWorkflow: () => null,
}));

vi.mock('~/components/common/ViewTabs', () => ({
    ViewTabs: () => null,
    useViewTab: () => ({ activeTab: 'actual', setActiveTab: vi.fn() }),
}));

vi.mock('~/components/orders/ConfirmDeliveryButton', () => ({
    ConfirmDeliveryButton: () => null,
}));

vi.mock('~/components/common/forms/MultiSelectComponent', () => ({
    default: () => null,
}));

vi.mock('~/components/shop/PaymentInstructions', () => ({
    default: () => null,
}));

vi.mock('~/components/issues', () => ({
    IssueStatusBadge: () => null,
    CreateIssueModal: vi.fn(({ issueWindow, onClose, onSuccess }: { issueWindow: any; onClose: () => void; onSuccess: () => void }) =>
        issueWindow ? (
            <div data-testid="create-issue-modal">
                <button onClick={onSuccess}>submit-issue</button>
                <button onClick={onClose}>cancel-issue</button>
            </div>
        ) : null
    ),
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

const mockProduct = {
    id: 'prod-1',
    productId: 'product-uuid-1',
    productName: 'Test Product',
    quantity: 1,
    price: 25.00,
    configuration: '{"size":"M"}',
    status: 'PENDING',
};

const mockOrder: Order = {
    id: 'ORD001',
    user: { id: 'U1', name: 'Test User', email: 'user@example.com' },
    status: 'PAYMENT_CONFIRMED',
    createdAt: '2024-06-01T10:00:00Z',
    hasOpenIssues: false,
    products: [mockProduct],
};

const emptyPage = { content: [], page: { totalElements: 0, totalPages: 0, number: 0, size: 0 } };

function renderPage(route = '/') {
    return render(
        <MemoryRouter initialEntries={[route]}>
            <MyOrdersPage />
        </MemoryRouter>
    );
}

describe('my-orders route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAuth).mockReturnValue({
            isAuthenticated: () => true,
            hasPermission: () => false,
            user: null,
            loading: false,
        } as any);
        vi.mocked(orderService.getMyOrders).mockResolvedValue({ content: [mockOrder], page: { totalElements: 1, totalPages: 1, number: 0, size: 50 } });
        vi.mocked(productService.getAllProducts).mockResolvedValue(emptyPage as any);
        vi.mocked(familyProductService.listFamilyProducts).mockResolvedValue(emptyPage as any);
        vi.mocked(issueService.getIssuesByOrder).mockResolvedValue([]);
    });

    describe('meta', () => {
        it('returns the correct title and description meta tags', () => {
            const result = meta({} as any);
            expect(result).toEqual([
                { title: 'Yambo - Mis Pedidos' },
                { name: 'description', content: 'Historial de mis pedidos' },
            ]);
        });
    });

    describe('loading and rendering', () => {
        it('shows loading spinner on mount', () => {
            renderPage();
            expect(screen.getByText(/cargando/i)).toBeInTheDocument();
        });

        it('renders orders list after loading', async () => {
            renderPage();
            await waitFor(() => {
                expect(screen.getByText('#ORD001')).toBeInTheDocument();
            });
        });

        it('shows empty state when no orders', async () => {
            vi.mocked(orderService.getMyOrders).mockResolvedValue(emptyPage as any);
            renderPage();
            await waitFor(() => {
                expect(screen.getByText(/no tienes pedidos/i)).toBeInTheDocument();
            });
        });

        it('shows error message when loading fails', async () => {
            vi.mocked(orderService.getMyOrders).mockRejectedValue('network-failure');
            renderPage();
            await waitFor(() => {
                expect(screen.getByText('¡Los pedidos no aparecen!')).toBeInTheDocument();
            });
        });
    });

    describe('order details modal', () => {
        it('opens order details when "Ver detalles" is clicked', async () => {
            renderPage();
            await waitFor(() => expect(screen.getByText('Ver detalles')).toBeInTheDocument());
            fireEvent.click(screen.getByText('Ver detalles'));
            await waitFor(() => {
                expect(screen.getByText('Nueva incidencia (varios productos)')).toBeInTheDocument();
            });
        });
    });

    describe('create issue modal', () => {
        it('opens CreateIssueModal when "Nueva incidencia" button is clicked inside order detail', async () => {
            renderPage();
            await waitFor(() => expect(screen.getByText('Ver detalles')).toBeInTheDocument());
            fireEvent.click(screen.getByText('Ver detalles'));
            await waitFor(() => expect(screen.getByText('Nueva incidencia (varios productos)')).toBeInTheDocument());
            fireEvent.click(screen.getByText('Nueva incidencia (varios productos)'));
            await waitFor(() => {
                expect(screen.getByTestId('create-issue-modal')).toBeInTheDocument();
            });
        });

        it('closes the modal when cancel is clicked', async () => {
            renderPage();
            await waitFor(() => expect(screen.getByText('Ver detalles')).toBeInTheDocument());
            fireEvent.click(screen.getByText('Ver detalles'));
            await waitFor(() => expect(screen.getByText('Nueva incidencia (varios productos)')).toBeInTheDocument());
            fireEvent.click(screen.getByText('Nueva incidencia (varios productos)'));
            await waitFor(() => expect(screen.getByTestId('create-issue-modal')).toBeInTheDocument());
            fireEvent.click(screen.getByText('cancel-issue'));
            await waitFor(() => {
                expect(screen.queryByTestId('create-issue-modal')).not.toBeInTheDocument();
            });
        });

        it('reloads issues and closes modal when issue is created', async () => {
            renderPage();
            await waitFor(() => expect(screen.getByText('Ver detalles')).toBeInTheDocument());
            fireEvent.click(screen.getByText('Ver detalles'));
            await waitFor(() => expect(screen.getByText('Nueva incidencia (varios productos)')).toBeInTheDocument());
            fireEvent.click(screen.getByText('Nueva incidencia (varios productos)'));
            await waitFor(() => expect(screen.getByTestId('create-issue-modal')).toBeInTheDocument());

            vi.mocked(issueService.getIssuesByOrder).mockClear();
            vi.mocked(issueService.getIssuesByOrder).mockResolvedValue([]);
            fireEvent.click(screen.getByText('submit-issue'));

            await waitFor(() => {
                expect(screen.queryByTestId('create-issue-modal')).not.toBeInTheDocument();
                expect(issueService.getIssuesByOrder).toHaveBeenCalledWith('ORD001');
            });
        });

        it('passes correct issueWindow to CreateIssueModal', async () => {
            renderPage();
            await waitFor(() => expect(screen.getByText('Ver detalles')).toBeInTheDocument());
            fireEvent.click(screen.getByText('Ver detalles'));
            await waitFor(() => expect(screen.getByText('Nueva incidencia (varios productos)')).toBeInTheDocument());
            fireEvent.click(screen.getByText('Nueva incidencia (varios productos)'));

            await waitFor(() => expect(screen.getByTestId('create-issue-modal')).toBeInTheDocument());

            const lastIssueWindow = vi.mocked(CreateIssueModal).mock.lastCall?.[0]?.issueWindow;
            expect(lastIssueWindow?.orderId).toBe('ORD001');
            expect(lastIssueWindow?.orderedProducts).toHaveLength(1);
            expect(lastIssueWindow?.orderedProducts[0]).toMatchObject({
                id: 'prod-1',
                name: 'Test Product',
                quantity: 1,
                unitPrice: 25.00,
            });
        });
    });
});
