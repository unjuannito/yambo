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

vi.mock('~/components/orders/ConfirmDeliveryButton', () => ({
    ConfirmDeliveryButton: () => null,
}));

vi.mock('~/components/common/forms/MultiSelectComponent', () => ({
    default: ({ onChange }: { onChange: (e: any) => void }) => (
        <select
            multiple
            data-testid="status-filter"
            onChange={onChange}
        >
            <option value="PAYMENT_CONFIRMED">Pago confirmado</option>
            <option value="CANCELED">Cancelado</option>
        </select>
    ),
}));

vi.mock('~/components/shop/PaymentInstructions', () => ({
    default: () => null,
}));

vi.mock('~/components/common/FileUploader', () => ({
    default: vi.fn(({ onUpload }: { onUpload: (f: any) => void }) => (
        <div data-testid="file-uploader">
            <button onClick={() => onUpload({ id: 'file-1' })}>upload-file</button>
        </div>
    )),
}));

vi.mock('~/components/issues', async () => {
    const actual = await vi.importActual<typeof import('~/components/issues')>('~/components/issues');
    return {
        ...actual,
        IssueStatusBadge: () => null,
    };
});

vi.mock('~/components/issues/CreateIssueModal', () => ({
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
        it('does not load orders when user is not authenticated', async () => {
            vi.mocked(useAuth).mockReturnValue({
                isAuthenticated: () => false,
                hasPermission: () => false,
                user: null,
                loading: false,
            } as any);

            renderPage();

            await waitFor(() => {
                expect(orderService.getMyOrders).not.toHaveBeenCalled();
            });
        });

        it('shows loading spinner on mount', () => {
            renderPage();
            expect(screen.getByText(/cargando/i)).toBeInTheDocument();
        });

        it('renders orders list after loading', async () => {
            renderPage();
            await waitFor(() => {
                expect(screen.getByText('#ORD001')).toBeInTheDocument();
                // Short status label appears
                expect(screen.getByText('Pagado')).toBeInTheDocument();
            });
        });

        it('shows empty state when no orders', async () => {
            vi.mocked(orderService.getMyOrders).mockResolvedValue(emptyPage as any);
            renderPage();
            await waitFor(() => {
                expect(screen.getByText(/no tienes pedidos/i)).toBeInTheDocument();
            });
        });

        it('filters rendered orders by selected statuses', async () => {
            const canceledOrder: Order = { ...mockOrder, id: 'ORD002', status: 'CANCELED' };
            vi.mocked(orderService.getMyOrders).mockResolvedValue({
                content: [mockOrder, canceledOrder],
                page: { totalElements: 2, totalPages: 1, number: 0, size: 50 },
            } as any);

            renderPage();

            await waitFor(() => {
                expect(screen.getByText('#ORD001')).toBeInTheDocument();
                expect(screen.getByText('#ORD002')).toBeInTheDocument();
            });

            const filter = screen.getByTestId('status-filter');
            const options = (filter as HTMLSelectElement).options;
            options[0].selected = true;
            fireEvent.change(filter);

            await waitFor(() => {
                expect(screen.getByText('#ORD001')).toBeInTheDocument();
                expect(screen.queryByText('#ORD002')).not.toBeInTheDocument();
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
        it('auto-opens order detail from orderId query param', async () => {
            renderPage('/?orderId=ORD001');

            await waitFor(() => {
                expect(screen.getByText('Nueva incidencia (varios productos)')).toBeInTheDocument();
            });
        });

        it('does not auto-open detail when query orderId is not in loaded orders', async () => {
            renderPage('/?orderId=ORD404');

            await waitFor(() => {
                expect(screen.getByText('#ORD001')).toBeInTheDocument();
            });

            expect(screen.queryByText('Nueva incidencia (varios productos)')).not.toBeInTheDocument();
        });

        it('opens order details when the order card is clicked', async () => {
            renderPage();
            await waitFor(() => expect(screen.getByText('#ORD001')).toBeInTheDocument());
            fireEvent.click(screen.getByText('#ORD001'));
            await waitFor(() => {
                expect(screen.getByText('Nueva incidencia (varios productos)')).toBeInTheDocument();
            });
        });
    });

    describe('create issue modal', () => {
        it('opens CreateIssueModal when "Nueva incidencia" button is clicked inside order detail', async () => {
            renderPage();
            await waitFor(() => expect(screen.getByText('#ORD001')).toBeInTheDocument());
            fireEvent.click(screen.getByText('#ORD001'));
            await waitFor(() => expect(screen.getByText('Nueva incidencia (varios productos)')).toBeInTheDocument());
            fireEvent.click(screen.getByText('Nueva incidencia (varios productos)'));
            await waitFor(() => {
                expect(screen.getByTestId('create-issue-modal')).toBeInTheDocument();
            });
        });

        it('closes the modal when cancel is clicked', async () => {
            renderPage();
            await waitFor(() => expect(screen.getByText('#ORD001')).toBeInTheDocument());
            fireEvent.click(screen.getByText('#ORD001'));
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
            await waitFor(() => expect(screen.getByText('#ORD001')).toBeInTheDocument());
            fireEvent.click(screen.getByText('#ORD001'));
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
            await waitFor(() => expect(screen.getByText('#ORD001')).toBeInTheDocument());
            fireEvent.click(screen.getByText('#ORD001'));
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

        it('opens CreateIssueModal with product pre-selected when "Reportar incidencia" is clicked', async () => {
            renderPage();
            await waitFor(() => expect(screen.getByText('#ORD001')).toBeInTheDocument());
            fireEvent.click(screen.getByText('#ORD001'));
            await waitFor(() => expect(screen.getByText('Reportar incidencia')).toBeInTheDocument());
            fireEvent.click(screen.getByText('Reportar incidencia'));

            await waitFor(() => expect(screen.getByTestId('create-issue-modal')).toBeInTheDocument());

            const lastIssueWindow = vi.mocked(CreateIssueModal).mock.lastCall?.[0]?.issueWindow;
            expect(lastIssueWindow?.initialSelectedOrderedProductIds).toEqual(['prod-1']);
        });

        it('does not open issue modal when the order has no products and shows raw unknown status', async () => {
            const emptyUnknownStatusOrder: Order = {
                ...mockOrder,
                id: 'ORD-EMPTY',
                status: 'CUSTOM_STATUS' as any,
                products: [],
            };

            vi.mocked(orderService.getMyOrders).mockResolvedValue({
                content: [emptyUnknownStatusOrder],
                page: { totalElements: 1, totalPages: 1, number: 0, size: 50 },
            } as any);

            renderPage();

            await waitFor(() => {
                expect(screen.getByText('#ORD-EMPTY')).toBeInTheDocument();
                expect(screen.getByText('CUSTOM_STATUS')).toBeInTheDocument();
            });

            // Click the card to open detail
            fireEvent.click(screen.getByText('#ORD-EMPTY'));

            await waitFor(() => {
                expect(screen.getByText('Nueva incidencia (varios productos)')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Nueva incidencia (varios productos)'));

            await waitFor(() => {
                expect(screen.queryByTestId('create-issue-modal')).not.toBeInTheDocument();
            });
        });
    });

    describe('order detail product rendering', () => {
        it('shows product name and price inside order detail', async () => {
            renderPage();
            await waitFor(() => expect(screen.getByText('#ORD001')).toBeInTheDocument());
            fireEvent.click(screen.getByText('#ORD001'));
            await waitFor(() => {
                // Product name appears both in card summary and in modal
                expect(screen.getAllByText('Test Product').length).toBeGreaterThanOrEqual(2);
                expect(screen.getByText('25.00 € c/u')).toBeInTheDocument();
            });
        });

        it('shows existing issue badge and link for products with open issues', async () => {
            vi.mocked(issueService.getIssuesByOrder).mockResolvedValue([{
                id: 'ISS001',
                title: 'Broken product',
                status: 'OPEN',
                orderedProductIds: ['prod-1'],
                createdAt: '2024-06-01T00:00:00Z',
                updatedAt: '2024-06-01T00:00:00Z',
            }] as any);

            renderPage();
            await waitFor(() => expect(screen.getByText('#ORD001')).toBeInTheDocument());
            fireEvent.click(screen.getByText('#ORD001'));
            await waitFor(() => {
                expect(screen.getByText('Broken product')).toBeInTheDocument();
                expect(screen.getByText('Ver incidencia')).toBeInTheDocument();
            });
            // "Reportar incidencia" should NOT appear when product already has an issue
            expect(screen.queryByText('Reportar incidencia')).not.toBeInTheDocument();
        });
    });

    describe('upload receipt modal', () => {
        const pendingOrder: Order = { ...mockOrder, status: 'PENDING_PAYMENT' };

        beforeEach(() => {
            vi.mocked(orderService.getMyOrders).mockResolvedValue({ content: [pendingOrder], page: { totalElements: 1, totalPages: 1, number: 0, size: 50 } });
        });

        it('opens upload receipt modal when "Justificante" is clicked', async () => {
            renderPage();
            await waitFor(() => expect(screen.getAllByText('Justificante').length).toBeGreaterThan(0));
            fireEvent.click(screen.getAllByText('Justificante')[0]);
            await waitFor(() => {
                expect(screen.getByTestId('file-uploader')).toBeInTheDocument();
            });
        });

        it('calls uploadReceipt and closes modal after successful upload', async () => {
            vi.mocked(orderService.uploadReceipt).mockResolvedValue({ ...pendingOrder, status: 'CONFIRMING_PAYMENT' } as any);

            renderPage();
            await waitFor(() => expect(screen.getAllByText('Justificante').length).toBeGreaterThan(0));
            fireEvent.click(screen.getAllByText('Justificante')[0]);
            await waitFor(() => expect(screen.getByTestId('file-uploader')).toBeInTheDocument());

            fireEvent.click(screen.getByText('upload-file'));

            await waitFor(() => {
                expect(orderService.uploadReceipt).toHaveBeenCalledWith('ORD001', 'file-1');
            });
        });

        it('shows "Verificando..." in card for CONFIRMING_PAYMENT status', async () => {
            const confirmingOrder: Order = { ...mockOrder, status: 'CONFIRMING_PAYMENT' };
            vi.mocked(orderService.getMyOrders).mockResolvedValue({ content: [confirmingOrder], page: { totalElements: 1, totalPages: 1, number: 0, size: 50 } });

            renderPage();
            await waitFor(() => {
                expect(screen.getByText('Verificando...')).toBeInTheDocument();
            });
        });
    });
});
