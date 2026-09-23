import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { WatcherManager } from './WatcherManager';
import type { IssueWatcher } from '~/types/issueType';
import { useAuth } from '~/hooks/useAuth';

vi.mock('~/services/adminUserService', () => ({
    adminUserService: {
        listUsers: vi.fn(),
    },
}));

vi.mock('~/hooks/useAuth', () => ({
    useAuth: vi.fn(),
}));

const mockWatcher: IssueWatcher = {
    id: 'W001',
    issueId: 'ISS001',
    email: 'watcher@example.com',
    userName: 'Test Watcher',
    createdAt: '2024-01-01T00:00:00Z',
};

describe('WatcherManager', () => {
    const mockOnAdd = vi.fn();
    const mockOnRemove = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAuth).mockReturnValue({
            user: {
                id: 'USER001',
                email: 'self@example.com',
                name: 'Self User',
                permissions: [],
            },
        } as any);
    });

    it('shows empty state when there are no watchers', () => {
        render(
            <WatcherManager
                watchers={[]}
                onAdd={mockOnAdd}
                onRemove={mockOnRemove}
            />
        );

        expect(screen.getByText('Sin seguidores aún')).toBeInTheDocument();
    });

    it('renders existing watchers', () => {
        render(
            <WatcherManager
                watchers={[mockWatcher]}
                onAdd={mockOnAdd}
                onRemove={mockOnRemove}
            />
        );

        expect(screen.getByText('Test Watcher')).toBeInTheDocument();
        expect(screen.getByText('watcher@example.com')).toBeInTheDocument();
    });

    it('shows loading state when loading prop is true', () => {
        render(
            <WatcherManager
                watchers={[]}
                onAdd={mockOnAdd}
                onRemove={mockOnRemove}
                loading={true}
            />
        );

        expect(screen.getByText('Cargando seguidores...')).toBeInTheDocument();
    });

    it('shows validation error when adding invalid email', async () => {
        render(
            <WatcherManager
                watchers={[]}
                onAdd={mockOnAdd}
                onRemove={mockOnRemove}
            />
        );

        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'not-a-valid-email' } });

        fireEvent.keyDown(input, { key: 'Enter' });

        await waitFor(() => {
            expect(screen.getByText('Introduce un email válido')).toBeInTheDocument();
        });
        expect(mockOnAdd).not.toHaveBeenCalled();
    });

    it('calls onAdd with valid email', async () => {
        mockOnAdd.mockResolvedValue(undefined);

        render(
            <WatcherManager
                watchers={[]}
                onAdd={mockOnAdd}
                onRemove={mockOnRemove}
            />
        );

        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'new@example.com' } });

        fireEvent.keyDown(input, { key: 'Enter' });

        await waitFor(() => {
            expect(mockOnAdd).toHaveBeenCalledWith('new@example.com', undefined);
        });
    });

    it('shows error when adding a watcher already in the list', async () => {
        render(
            <WatcherManager
                watchers={[mockWatcher]}
                onAdd={mockOnAdd}
                onRemove={mockOnRemove}
            />
        );

        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'watcher@example.com' } });

        fireEvent.keyDown(input, { key: 'Enter' });

        await waitFor(() => {
            expect(screen.getByText('Este email ya está en la lista de seguidores')).toBeInTheDocument();
        });
        expect(mockOnAdd).not.toHaveBeenCalled();
    });

    it('adds current user as watcher when clicking "Añadirme"', async () => {
        mockOnAdd.mockResolvedValue(undefined);

        render(
            <WatcherManager
                watchers={[]}
                onAdd={mockOnAdd}
                onRemove={mockOnRemove}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'Añadirme' }));

        await waitFor(() => {
            expect(mockOnAdd).toHaveBeenCalledWith('self@example.com', 'USER001');
        });
    });

    it('does not show "Añadirme" when current user is already a watcher', () => {
        render(
            <WatcherManager
                watchers={[{ ...mockWatcher, email: 'self@example.com' }]}
                onAdd={mockOnAdd}
                onRemove={mockOnRemove}
            />
        );

        expect(screen.queryByRole('button', { name: 'Añadirme' })).not.toBeInTheDocument();
        expect(mockOnAdd).not.toHaveBeenCalled();
    });

    it('renders user name as a link when watcher has userId', () => {
        const watcherWithId: IssueWatcher = {
            ...mockWatcher,
            userId: 'USR001',
        };

        render(
            <MemoryRouter>
                <WatcherManager
                    watchers={[watcherWithId]}
                    onAdd={mockOnAdd}
                    onRemove={mockOnRemove}
                />
            </MemoryRouter>
        );

        const link = screen.getByRole('link', { name: 'Test Watcher' });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/mi-espacio/admin/usuarios/USR001/perfil');
    });

    it('renders user name as plain text when watcher has no userId', () => {
        render(
            <MemoryRouter>
                <WatcherManager
                    watchers={[mockWatcher]}
                    onAdd={mockOnAdd}
                    onRemove={mockOnRemove}
                />
            </MemoryRouter>
        );

        expect(screen.getByText('Test Watcher')).toBeInTheDocument();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
});
