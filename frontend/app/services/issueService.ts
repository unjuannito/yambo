import { ApiService } from './apiService';
import type { PagedResponse } from '~/types/apiType';
import type {
    Issue,
    IssueDetail,
    IssueComment,
    IssueWatcher,
    CreateIssueRequest,
    AddCommentRequest,
} from '~/types/issueType';

export interface IssueListItem {
    id: string;
    orderedProductId: string;
    orderedProductIds?: string[];
    title: string;
    description: string;
    status: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    orderId?: string;
    productName?: string;
    customerName?: string;
}

export class IssueService extends ApiService {
    public async createIssue(request: CreateIssueRequest): Promise<Issue> {
        return this.post<Issue, CreateIssueRequest>('/issues', request);
    }

    public async getIssue(issueId: string): Promise<IssueDetail> {
        return this.get<IssueDetail>(`/issues/${issueId}`);
    }

    public async getIssuesByOrder(orderId: string): Promise<Issue[]> {
        return this.get<Issue[]>(`/issues/order/${orderId}`);
    }

    public async addComment(issueId: string, request: AddCommentRequest): Promise<IssueComment> {
        return this.post<IssueComment, AddCommentRequest>(`/issues/${issueId}/comments`, request);
    }

    public async getAllIssues(
        page = 0,
        size = 20,
        startDate?: string,
        endDate?: string,
        status?: string[],
        userId?: string,
        issueId?: string,
        title?: string
    ): Promise<PagedResponse<IssueListItem>> {
        const params = new URLSearchParams({
            page: page.toString(),
            size: size.toString(),
        });
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (status && status.length > 0) {
            for (const s of status) params.append('status', s);
        }
        if (userId) params.append('userId', userId);
        if (issueId) params.append('issueId', issueId);
        if (title) params.append('title', title);
        return this.get<PagedResponse<IssueListItem>>(`/issues?${params}`);
    }

    public async getMyIssues(
        page = 0,
        size = 20,
        startDate?: string,
        endDate?: string,
        status?: string[],
        title?: string
    ): Promise<PagedResponse<IssueListItem>> {
        const params = new URLSearchParams({
            page: page.toString(),
            size: size.toString(),
        });
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (status && status.length > 0) {
            for (const s of status) params.append('status', s);
        }
        if (title) params.append('title', title);
        return this.get<PagedResponse<IssueListItem>>(`/issues/my?${params}`);
    }

    public async getWatchers(issueId: string): Promise<IssueWatcher[]> {
        return this.get<IssueWatcher[]>(`/issues/${issueId}/watchers`);
    }

    public async addWatcher(issueId: string, email: string, userId?: string): Promise<IssueWatcher> {
        return this.post<IssueWatcher, { email: string; userId?: string }>(
            `/issues/${issueId}/watchers`,
            { email, userId }
        );
    }

    public async removeWatcher(issueId: string, email: string): Promise<void> {
        return this.deleteWithBody(`/issues/${issueId}/watchers`, { email });
    }

    public async updateIssueProducts(issueId: string, orderedProductIds: string[]): Promise<IssueDetail> {
        return this.put<IssueDetail, { orderedProductIds: string[] }>(
            `/issues/${issueId}/products`,
            { orderedProductIds }
        );
    }
}

export const issueService = new IssueService();
