import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { IssueDetailComponent } from './IssueDetailComponent';
import { issueService } from '~/services/issueService';

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
    default: ({ value }: { value: string }) => <div data-testid="markdown-editor">{value}</div>,
}));

vi.mock('./IssueCommentForm', () => ({
    IssueCommentForm: () => <div data-testid="issue-comment-form" />,
}));

vi.mock('~/components/common/WatcherManager', () => ({
    WatcherManager: () => <div data-testid="watcher-manager" />,
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

const mockIssueList = { content: [{ id: 'ISS001', orderId: 'ORD001' }] };

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

    it('shows error when getIssue rejects', async () => {
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
        expect(screen.getByText('Not found')).toBeInTheDocument();
    });

    it('renders issue title and ID when loaded successfully', async () => {
        vi.mocked(issueService.getIssue).mockResolvedValue(mockIssueDetail as any);
        vi.mocked(issueService.getAllIssues).mockResolvedValue(mockIssueList as any);
        vi.mocked(issueService.getWatchers).mockResolvedValue([]);

        render(
            <MemoryRouter>
                <IssueDetailComponent issueId="ISS001" />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Test Issue')).toBeInTheDocument();
        });
        expect(screen.getAllByText('ISS001').length).toBeGreaterThan(0);
        expect(screen.getByText('Test description')).toBeInTheDocument();
    });

    it('shows "No disponible" for watchers when not admin', async () => {
        vi.mocked(issueService.getIssue).mockResolvedValue(mockIssueDetail as any);
        vi.mocked(issueService.getAllIssues).mockResolvedValue(mockIssueList as any);
        vi.mocked(issueService.getWatchers).mockResolvedValue([]);

        render(
            <MemoryRouter>
                <IssueDetailComponent issueId="ISS001" isAdmin={false} />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByText('Test Issue')).toBeInTheDocument());
        expect(screen.getByText('No disponible')).toBeInTheDocument();
        expect(issueService.getWatchers).not.toHaveBeenCalled();
    });

    it('shows watcher count and calls getWatchers when isAdmin is true', async () => {
        vi.mocked(issueService.getIssue).mockResolvedValue(mockIssueDetail as any);
        vi.mocked(issueService.getAllIssues).mockResolvedValue(mockIssueList as any);
        vi.mocked(issueService.getWatchers).mockResolvedValue([
            { id: 'w1', email: 'a@b.com', name: 'Alice' },
        ] as any);

        render(
            <MemoryRouter>
                <IssueDetailComponent issueId="ISS001" isAdmin={true} />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByText('Test Issue')).toBeInTheDocument());
        await waitFor(() => {
            expect(screen.getByText('1 seguidores')).toBeInTheDocument();
        });
        expect(issueService.getWatchers).toHaveBeenCalledWith('ISS001');
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

    it('shows "Sin actividad aún" when there are no comments', async () => {
        vi.mocked(issueService.getIssue).mockResolvedValue({ ...mockIssueDetail, comments: [] } as any);
        vi.mocked(issueService.getAllIssues).mockResolvedValue(mockIssueList as any);
        vi.mocked(issueService.getWatchers).mockResolvedValue([]);

        render(
            <MemoryRouter>
                <IssueDetailComponent issueId="ISS001" />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByText('Test Issue')).toBeInTheDocument());
        expect(screen.getByText('Sin actividad aún')).toBeInTheDocument();
    });
});
