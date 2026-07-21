import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import UserHistorial from './historial';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));

vi.mock('react-router', async () => {
    const actual = await vi.importActual<typeof import('react-router')>('react-router');
    return {
        ...actual,
        useOutletContext: () => ({
            user: { id: 'qaaiDOpd', name: 'Test User', email: 'test@example.com', createdAt: '2024-01-15T10:00:00Z' },
            refreshUser: vi.fn(),
            userId: 'qaaiDOpd',
        }),
    };
});

describe('UserHistorial', () => {
    it('renders account info section', () => {
        render(
            <MemoryRouter>
                <UserHistorial />
            </MemoryRouter>
        );

        expect(screen.getByText('Información de la cuenta')).toBeInTheDocument();
        expect(screen.getByText(/2024/)).toBeInTheDocument();           // createdAt year
        expect(screen.getByText('qaaiDOpd')).toBeInTheDocument();   // user id
    });

    it('pedidos link includes customerId query param', () => {
        render(
            <MemoryRouter>
                <UserHistorial />
            </MemoryRouter>
        );

        const pedidosLink = screen.getByText('Pedidos').closest('a');
        expect(pedidosLink).toHaveAttribute('href', '/mi-espacio/admin/pedidos?customerId=qaaiDOpd');
    });

    it('incidencias link includes userId query param', () => {
        render(
            <MemoryRouter>
                <UserHistorial />
            </MemoryRouter>
        );

        const incidenciasLink = screen.getByText('Incidencias').closest('a');
        expect(incidenciasLink).toHaveAttribute('href', '/mi-espacio/admin/incidencias?userId=qaaiDOpd');
    });
});
