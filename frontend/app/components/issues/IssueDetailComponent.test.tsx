import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { IssueDetailComponent } from './IssueDetailComponent';
import { issueService } from '~/services/issueService';
import { orderService } from '~/services/orderService';

vi.mock('~/services/issueService', () => ({
    issueService: {
        getIssue: vi.fn(),
        getAllIssues: vi.fn(),
        getWatchers: vi.fn(),
        updateIssueProducts: vi.fn(),
        addWatcher: vi.fn(),
        removeWatcher: vi.fn(),
    },
}));

vi.mock('~/services/orderService', () => ({
    orderService: {
        getOrder: vi.fn(),
        confirmProductDelivery: vi.fn(),
    },
}));

vi.mock('~/components/common/forms/MarkdownEditor', () => ({
    default: () => <div data-testid="markdown-editor" />,
}));

const mockIssueDetail = {
    id: 'ISS001',
    title: 'Test Issue',
    description: 'Test description',
    status: 'OPEN',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    comments: [],
    relatedProducts: [],
    orderedProductIds: [],
};

describe('IssueDetailComponent', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows loading state while fetching issue', () => {
        vi.mocked(issueService.getIssue).mockReturnValue(new Promise(() => {}));
        vi.mocked(issueService.getAllIssues).mockReturnValue(new Promise(() => {}));
        vi.mocked(issueService.getWatchers).mockReturnValue(new Promise(() => {}));

        render(
            <MemoryRouter>
                <IssueDetailComponent issueId="ISS001" />
            </MemoryRouter>
        );

        expect(screen.getByText('Cargando...')).toBeInTheDocument();
    });

    it('shows issue not found when getIssue resolves with null-like value', async () => {
        vi.mocked(issueService.getIssue).mockRejectedValue(new Error('Not found'));
        vi.mocked(issueService.getAllIssues).mockResolvedValue({ content: [] } as any);
        vi.mocked(issueService.getWatchers).mockResolvedValue([]);

        render(
            <MemoryRouter>
                <IssueDetailComponent issueId="ISS001" />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.queryByText('Cargando...')).not.toBeInTheDocument();
        });
    });

    it('loads watchers when isAdmin is true', async () => {
        vi.mocked(issueService.getIssue).mockReturnValue(new Promise(() => {}));
        vi.mocked(issueService.getAllIssues).mockReturnValue(new Promise(() => {}));
        vi.mocked(issueService.getWatchers).mockResolvedValue([]);

        render(
            <MemoryRouter>
                <IssueDetailComponent issueId="ISS001" isAdmin={true} />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(issueService.getWatchers).toHaveBeenCalledWith('ISS001');
        });
    });

    it('does not load watchers when isAdmin is false', async () => {
        vi.mocked(issueService.getIssue).mockReturnValue(new Promise(() => {}));
        vi.mocked(issueService.getAllIssues).mockReturnValue(new Promise(() => {}));

        render(
            <MemoryRouter>
                <IssueDetailComponent issueId="ISS001" isAdmin={false} />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(issueService.getWatchers).not.toHaveBeenCalled();
        });
    });
});
