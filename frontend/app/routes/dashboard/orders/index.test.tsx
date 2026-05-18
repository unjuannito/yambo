import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import Orders, { meta } from './index';
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
        getAllOrders: vi.fn(),
        getOrder: vi.fn(),
        updateOrderStatus: vi.fn(),
        adminUploadReceipt: vi.fn(),
    },
}));

vi.mock('~/services/issueService', () => ({
    issueService: {
        getIssuesByOrder: vi.fn(),
        createIssue: vi.fn(),
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

vi.mock('~/services/fileService', () => ({
    fileService: {
        getById: vi.fn(),
    },
}));

vi.mock('~/services/exportService', () => ({
    exportService: {
        exportOrders: vi.fn(),
    },
}));

vi.mock('~/components/common/FilterableTable', () => ({
    FilterableTable: () => null,
}));

vi.mock('~/components/common/StatusWorkflow', () => ({
    StatusWorkflow: () => null,
}));

vi.mock('~/components/common/ViewTabs', () => ({
    ViewTabs: () => null,
    useViewTab: () => ({ activeTab: 'actual', setActiveTab: vi.fn() }),
}));

vi.mock('~/components/common/RequirePermission', () => ({
    RequirePermission: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('~/components/issues', () => ({
    IssueStatusBadge: () => null,
    IssueForm: () => null,
    CreateIssueModal: vi.fn(({ issueWindow, onClose, onSuccess }: { issueWindow: any; onClose: () => void; onSuccess: () => void }) =>
        issueWindow ? (
            <div data-testid="issue-form">
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
    quantity: 2,
    price: 29.99,
    configuration: '{"size":"M"}',
    status: 'PENDING',
};

const mockOrder: Order = {
    id: 'ORD001',
    user: { id: 'U1', name: 'Test User', email: 'test@example.com' },
    status: 'PAYMENT_CONFIRMED',
    createdAt: '2024-01-01T00:00:00Z',
    hasOpenIssues: false,
    products: [mockProduct],
};

const makeMerchAdminAuth = () => ({
    hasPermission: (perm: { obj: string; action: string } | { obj: string; action: string }[]) => {
        if (Array.isArray(perm)) return false;
        return perm.obj === 'issue' && perm.action === 'update';
    },
    user: null,
    loading: false,
    login: vi.fn(),
    isAuthenticated: () => true,
    logout: vi.fn(),
    reload: vi.fn(),
});

const makeRegularUserAuth = () => ({
    ...makeMerchAdminAuth(),
    hasPermission: () => false,
});

function renderWithRouter(initialPath = '/') {
    return render(
        <MemoryRouter initialEntries={[initialPath]}>
            <Orders />
        </MemoryRouter>
    );
}

describe('Orders route', () => {
    describe('meta', () => {
        it('returns the correct title and name meta tags', () => {
            const result = meta({} as any);
            expect(result).toEqual([
                { title: 'Yambo - Pedidos' },
                { name: 'Yambo - Pedidos', content: 'Yambo - Pedidos' },
            ]);
        });
    });

    describe('merch admin create issue feature', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            vi.mocked(orderService.getOrder).mockResolvedValue(mockOrder);
            vi.mocked(issueService.getIssuesByOrder).mockResolvedValue([]);
            vi.mocked(productService.getAllProducts).mockResolvedValue({ content: [] } as any);
            vi.mocked(familyProductService.listFamilyProducts).mockResolvedValue({ content: [] } as any);
        });

        it('shows "Crear incidencia" and "Nueva incidencia (varios productos)" buttons when user is merch admin', async () => {
            vi.mocked(useAuth).mockReturnValue(makeMerchAdminAuth() as any);

            renderWithRouter('/?orderId=ORD001');

            await waitFor(() => {
                expect(screen.getByText('Test Product')).toBeInTheDocument();
            });

            expect(screen.getByText('+ Crear incidencia')).toBeInTheDocument();
            expect(screen.getByText('+ Nueva incidencia (varios productos)')).toBeInTheDocument();
        });

        it('does not show create issue buttons when user is not merch admin', async () => {
            vi.mocked(useAuth).mockReturnValue(makeRegularUserAuth() as any);

            renderWithRouter('/?orderId=ORD001');

            await waitFor(() => {
                expect(screen.getByText('Test Product')).toBeInTheDocument();
            });

            expect(screen.queryByText('+ Crear incidencia')).not.toBeInTheDocument();
            expect(screen.queryByText('+ Nueva incidencia (varios productos)')).not.toBeInTheDocument();
        });

        it('keeps page usable when deep-link order lookup fails', async () => {
            vi.mocked(useAuth).mockReturnValue(makeMerchAdminAuth() as any);
            vi.mocked(orderService.getOrder).mockRejectedValue(new Error('not-found'));

            renderWithRouter('/?orderId=ORD404');

            await waitFor(() => {
                expect(orderService.getOrder).toHaveBeenCalledWith('ORD404');
            });

            expect(screen.queryByTestId('issue-form')).not.toBeInTheDocument();
        });

        it('does not deep-link lookup when orderId query param is missing', async () => {
            vi.mocked(useAuth).mockReturnValue(makeMerchAdminAuth() as any);

            renderWithRouter('/');

            await waitFor(() => {
                expect(productService.getAllProducts).toHaveBeenCalled();
            });

            expect(orderService.getOrder).not.toHaveBeenCalled();
        });

        it('opens the Create Issue modal when "Crear incidencia" is clicked', async () => {
            vi.mocked(useAuth).mockReturnValue(makeMerchAdminAuth() as any);

            renderWithRouter('/?orderId=ORD001');

            await waitFor(() => {
                expect(screen.getByText('+ Crear incidencia')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('+ Crear incidencia'));

            await waitFor(() => {
                expect(screen.getByTestId('issue-form')).toBeInTheDocument();
            });
        });

        it('opens the Create Issue modal with all products pre-selected when order-level button is clicked', async () => {
            vi.mocked(useAuth).mockReturnValue(makeMerchAdminAuth() as any);

            renderWithRouter('/?orderId=ORD001');

            await waitFor(() => {
                expect(screen.getByText('+ Nueva incidencia (varios productos)')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('+ Nueva incidencia (varios productos)'));

            await waitFor(() => {
                expect(screen.getByTestId('issue-form')).toBeInTheDocument();
            });

            const lastIssueWindow = vi.mocked(CreateIssueModal).mock.lastCall?.[0]?.issueWindow;
            // No specific pre-selection — CreateIssueModal will default to all selected
            expect(lastIssueWindow?.initialSelectedOrderedProductIds).toBeUndefined();
            expect(lastIssueWindow?.orderedProducts).toHaveLength(mockOrder.products.length);
        });

        it('closes the Create Issue modal when IssueForm calls onCancel', async () => {
            vi.mocked(useAuth).mockReturnValue(makeMerchAdminAuth() as any);

            renderWithRouter('/?orderId=ORD001');

            await waitFor(() => {
                expect(screen.getByText('+ Crear incidencia')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('+ Crear incidencia'));

            await waitFor(() => {
                expect(screen.getByTestId('issue-form')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('cancel-issue'));

            await waitFor(() => {
                expect(screen.queryByTestId('issue-form')).not.toBeInTheDocument();
            });
        });

        it('shows success toast and refreshes issues when issue is created successfully', async () => {
            vi.mocked(useAuth).mockReturnValue(makeMerchAdminAuth() as any);

            renderWithRouter('/?orderId=ORD001');

            await waitFor(() => {
                expect(screen.getByText('+ Crear incidencia')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('+ Crear incidencia'));

            await waitFor(() => {
                expect(screen.getByTestId('issue-form')).toBeInTheDocument();
            });

            // Reset call count before triggering success so we can assert a fresh call
            vi.mocked(issueService.getIssuesByOrder).mockClear();
            vi.mocked(issueService.getIssuesByOrder).mockResolvedValue([]);

            fireEvent.click(screen.getByText('submit-issue'));

            await waitFor(() => {
                expect(toast.success).toHaveBeenCalledWith('Incidencia creada correctamente');
            });

            expect(issueService.getIssuesByOrder).toHaveBeenCalledWith('ORD001');

            await waitFor(() => {
                expect(screen.queryByTestId('issue-form')).not.toBeInTheDocument();
            });
        });

        it('passes all order products to CreateIssueModal with clicked product pre-selected', async () => {
            vi.mocked(useAuth).mockReturnValue(makeMerchAdminAuth() as any);

            renderWithRouter('/?orderId=ORD001');

            await waitFor(() => {
                expect(screen.getByText('+ Crear incidencia')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('+ Crear incidencia'));

            await waitFor(() => {
                expect(screen.getByTestId('issue-form')).toBeInTheDocument();
            });

            const lastIssueWindow = vi.mocked(CreateIssueModal).mock.lastCall?.[0]?.issueWindow;
            // All products in the order should be passed (not just the clicked one)
            expect(lastIssueWindow?.orderedProducts).toHaveLength(mockOrder.products.length);
            expect(lastIssueWindow).toMatchObject({
                orderId: 'ORD001',
                orderedProducts: [
                    expect.objectContaining({
                        id: 'prod-1',
                        name: 'Test Product',
                        quantity: 2,
                        unitPrice: 29.99,
                    }),
                ],
                // clicked product is pre-selected
                initialSelectedOrderedProductIds: ['prod-1'],
            });
        });

        it('passes all products when order has multiple products, pre-selects the clicked one', async () => {
            const secondProduct = {
                id: 'prod-2',
                productId: 'product-uuid-2',
                productName: 'Second Product',
                quantity: 1,
                price: 9.99,
                configuration: '{}',
                status: 'PENDING',
            };
            const multiProductOrder: Order = { ...mockOrder, products: [mockProduct, secondProduct] };
            vi.mocked(orderService.getOrder).mockResolvedValue(multiProductOrder);

            vi.mocked(useAuth).mockReturnValue(makeMerchAdminAuth() as any);

            renderWithRouter('/?orderId=ORD001');

            await waitFor(() => {
                expect(screen.getAllByText('+ Crear incidencia')).toHaveLength(2);
            });

            // Click the button for the second product
            fireEvent.click(screen.getAllByText('+ Crear incidencia')[1]);

            await waitFor(() => {
                expect(screen.getByTestId('issue-form')).toBeInTheDocument();
            });

            const lastIssueWindow = vi.mocked(CreateIssueModal).mock.lastCall?.[0]?.issueWindow;
            // Both products passed
            expect(lastIssueWindow?.orderedProducts).toHaveLength(2);
            // Second product is pre-selected
            expect(lastIssueWindow?.initialSelectedOrderedProductIds).toEqual(['prod-2']);
        });
    });
});
