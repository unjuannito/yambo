import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router';
import { IssueChatMessage } from './IssueChatMessage';

describe('IssueChatMessage', () => {
    const baseMessage = {
        id: 'msg-1',
        text: 'This is a test message',
        createdAt: '2024-01-15T10:30:00Z',
        userId: 'USR001',
        userName: 'Test User',
    };

    it('renders user name as a link when message has userId', () => {
        render(
            <MemoryRouter>
                <IssueChatMessage
                    message={baseMessage}
                    isRight={false}
                    isFromCreator={false}
                />
            </MemoryRouter>
        );

        const link = screen.getByRole('link', { name: 'Test User' });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/mi-espacio/admin/usuarios/USR001/perfil');
    });

    it('renders user name as plain text when message has no userId', () => {
        const messageWithoutUserId = { ...baseMessage, userId: '' };

        render(
            <MemoryRouter>
                <IssueChatMessage
                    message={messageWithoutUserId}
                    isRight={false}
                    isFromCreator={false}
                />
            </MemoryRouter>
        );

        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('shows the avatar initial', () => {
        render(
            <MemoryRouter>
                <IssueChatMessage
                    message={baseMessage}
                    isRight={false}
                    isFromCreator={true}
                />
            </MemoryRouter>
        );

        expect(screen.getByText('T')).toBeInTheDocument();
    });
});
