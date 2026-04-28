import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WatcherManager } from './WatcherManager';
import { adminUserService } from '~/services/adminUserService';
import type { IssueWatcher } from '~/types/issueType';

vi.mock('~/services/adminUserService', () => ({
    adminUserService: {
        listUsers: vi.fn(),
    },
}));

const mockWatcher: IssueWatcher = {
    id: 'W001',
    email: 'watcher@example.com',
    userName: 'Test Watcher',
};

describe('WatcherManager', () => {
    const mockOnAdd = vi.fn();
    const mockOnRemove = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
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

        const addButton = screen.getByRole('button', { name: /añadir/i });
        fireEvent.click(addButton);

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

        const addButton = screen.getByRole('button', { name: /añadir/i });
        fireEvent.click(addButton);

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

        const addButton = screen.getByRole('button', { name: /añadir/i });
        fireEvent.click(addButton);

        await waitFor(() => {
            expect(screen.getByText('Este email ya está en la lista de seguidores')).toBeInTheDocument();
        });
        expect(mockOnAdd).not.toHaveBeenCalled();
    });
});
