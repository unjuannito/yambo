import { ApiService } from './apiService';
import type {
    Issue,
    IssueDetail,
    IssueComment,
    CreateIssueRequest,
    AddCommentRequest,
} from '~/types/issueType';

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
}

export const issueService = new IssueService();
