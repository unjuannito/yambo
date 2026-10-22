import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import RecentOrdersList from './RecentOrdersList';
import type { DashboardOrder } from '~/hooks/useDashboardData';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const map: Record<string, string> = {
                'orders.product': 'producto',
                'orders.seeAll': 'Ver todos',
            };
            return map[key] || key;
        },
    }),
}));

const mockOrder: DashboardOrder = {
    id: 'ORD001',
    user: { id: 'USR001', name: 'Test User', email: 'test@example.com' },
    status: 'PAYMENT_CONFIRMED',
    createdAt: '2024-01-15T10:00:00Z',
    closedAt: null,
    hasOpenIssues: false,
    receiptFileId: null,
    products: [{ id: 'p1', productId: 'prod-1', productName: 'Test Product', quantity: 2, price: 15, status: 'PENDING' }],
};

describe('RecentOrdersList', () => {
    it('renders user name as a link when order has user', () => {
        render(
            <MemoryRouter>
                <RecentOrdersList orders={[mockOrder]} />
            </MemoryRouter>
        );

        const link = screen.getByRole('link', { name: 'Test User' });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/mi-espacio/admin/usuarios/USR001/perfil');
    });

    it('renders product count', () => {
        render(
            <MemoryRouter>
                <RecentOrdersList orders={[mockOrder]} />
            </MemoryRouter>
        );

        expect(screen.getByText(/2/)).toBeInTheDocument();
        expect(screen.getByText(/Test User/)).toBeInTheDocument();
    });
});
