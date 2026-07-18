import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import BottomTabBar from './BottomTabBar';
import type { Link } from '~/data/links';

const mockNavigate = vi.fn();
const mockLogout = vi.fn();

vi.mock('react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router')>();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

vi.mock('~/hooks/useAuth', () => ({
    useAuth: () => ({ logout: mockLogout }),
}));

vi.mock('~/data/navConfig', () => ({
    NAV_SECTIONS: [
        { title: 'General', items: ['home', 'myAccount'] },
        { title: 'Admin', items: ['settings', 'users'] },
    ],
    NAV_ICONS: {
        home: <span>home-icon</span>,
        myAccount: <span>account-icon</span>,
        settings: <span>settings-icon</span>,
        users: <span>users-icon</span>,
    },
}));

vi.mock('@fortawesome/react-fontawesome', () => ({
    FontAwesomeIcon: () => <span />,
}));

const allLinks: Link[] = [
    { name: 'home', href: '/mi-espacio', label: 'Dashboard', need: null },
    { name: 'myOrders', href: '/mi-espacio/mis-pedidos', label: 'Mis pedidos', need: null },
    { name: 'merch', href: '/mi-espacio/articulos', label: 'Artículos', need: null },
    { name: 'issues', href: '/mi-espacio/issues', label: 'Issues', need: null },
    { name: 'myAccount', href: '/mi-espacio/cuenta', label: 'Mi Cuenta', need: null },
    { name: 'settings', href: '/mi-espacio/admin/configuracion', label: 'Config', need: null },
    { name: 'users', href: '/mi-espacio/admin/usuarios', label: 'Usuarios', need: null },
];

function renderComponent(links: Link[] = allLinks) {
    return render(
        <MemoryRouter>
            <BottomTabBar links={links} />
        </MemoryRouter>
    );
}

function getSheet(): HTMLElement {
    return document.querySelector('.rounded-t-2xl') as HTMLElement;
}

describe('BottomTabBar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders all primary tab labels when all links are present', () => {
        renderComponent();
        expect(screen.queryAllByText('Dashboard').length).toBeGreaterThan(0);
        expect(screen.queryAllByText('Mis pedidos').length).toBeGreaterThan(0);
        expect(screen.queryAllByText('Artículos').length).toBeGreaterThan(0);
        expect(screen.queryAllByText('Issues').length).toBeGreaterThan(0);
    });

    it('always renders the "Más" button', () => {
        renderComponent();
        expect(screen.getByRole('button', { name: /más/i })).toBeInTheDocument();
    });

    it('only renders primary tabs that are present in the links prop', () => {
        renderComponent(allLinks.filter((l) => l.name !== 'issues'));
        expect(screen.queryAllByText('Issues')).toHaveLength(0);
        expect(screen.queryAllByText('Dashboard').length).toBeGreaterThan(0);
    });

    it('sheet is closed initially (translate-y-full class)', () => {
        renderComponent();
        expect(getSheet().className).toContain('translate-y-full');
    });

    it('opens the sheet when "Más" button is clicked', () => {
        renderComponent();
        fireEvent.click(screen.getByRole('button', { name: /más/i }));
        expect(getSheet().className).toContain('translate-y-0');
        expect(screen.getByText('Más opciones')).toBeVisible();
    });

    it('closes the sheet when "Más" button is clicked again', () => {
        renderComponent();
        const btn = screen.getByRole('button', { name: /más/i });
        fireEvent.click(btn);
        fireEvent.click(btn);
        expect(getSheet().className).toContain('translate-y-full');
    });

    it('closes the sheet when mousedown+click happens on "Más" button', () => {
        renderComponent();
        const btn = screen.getByRole('button', { name: /más/i });
        fireEvent.click(btn);
        expect(getSheet().className).toContain('translate-y-0');

        // Simulate real browser sequence: document mousedown first, then button click.
        fireEvent.mouseDown(btn);
        fireEvent.click(btn);

        expect(getSheet().className).toContain('translate-y-full');
    });

    it('shows secondary links grouped by section when sheet is open', () => {
        renderComponent();
        fireEvent.click(screen.getByRole('button', { name: /más/i }));
        expect(screen.getByText('Admin')).toBeInTheDocument();
        expect(screen.getByText('Config')).toBeInTheDocument();
        expect(screen.getByText('Usuarios')).toBeInTheDocument();
    });

    it('shows links configured in NAV_SECTIONS inside the sheet', () => {
        renderComponent();
        fireEvent.click(screen.getByRole('button', { name: /más/i }));
        const allDashboardEls = screen.getAllByText('Dashboard');
        expect(allDashboardEls.some((el) => el.closest('.grid') !== null)).toBe(true);
    });

    it('closes the sheet when a secondary link is clicked', () => {
        renderComponent();
        fireEvent.click(screen.getByRole('button', { name: /más/i }));
        fireEvent.click(screen.getByText('Config'));
        expect(getSheet().className).toContain('translate-y-full');
    });

    it('closes the sheet on outside mousedown', () => {
        renderComponent();
        fireEvent.click(screen.getByRole('button', { name: /más/i }));
        expect(getSheet().className).toContain('translate-y-0');
        fireEvent.mouseDown(document.body);
        expect(getSheet().className).toContain('translate-y-full');
    });

    it('renders the overlay when the sheet is open', () => {
        renderComponent();
        expect(document.querySelector('.bg-black\\/30')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /más/i }));
        expect(document.querySelector('.bg-black\\/30')).toBeInTheDocument();
    });

    it('closes the sheet when the overlay is clicked', () => {
        renderComponent();
        fireEvent.click(screen.getByRole('button', { name: /más/i }));
        const overlay = document.querySelector('.bg-black\\/30') as HTMLElement;
        fireEvent.click(overlay);
        expect(getSheet().className).toContain('translate-y-full');
    });

    it('calls logout() and navigates to /login when "Cerrar sesión" is clicked', () => {
        renderComponent();
        fireEvent.click(screen.getByRole('button', { name: /más/i }));
        fireEvent.click(screen.getByText('Cerrar sesión'));
        expect(mockLogout).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
});
