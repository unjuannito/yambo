export enum IssueStatus {
    OPEN = 'OPEN',
    IN_PROGRESS = 'IN_PROGRESS',
    CLOSED = 'CLOSED'
}

export interface IssueComment {
    id: string;
    issueId: string;
    userId: string;
    userName?: string;
    status?: IssueStatus;
    text: string;
    createdAt: string;
}

export interface Issue {
    id: string;
    orderedProductIds: string[];
    title: string;
    description: string;
    status: IssueStatus;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface IssueDetail extends Issue {
    userName?: string;
    comments: IssueComment[];
    relatedProducts?: IssueRelatedProduct[];
}

export interface IssueRelatedProduct {
    orderedProductId: string;
    productId?: string;
    productName?: string;
    familyProductName?: string;
    quantity?: number;
    unitPrice?: string;
    configuration?: string;
}

export interface CreateIssueRequest {
    orderedProductIds: string[];
    title: string;
    description: string;
}

export interface IssueReportWindowModel {
    orderId: string;
    orderedProducts: {
        id: string;
        name: string;
        configuration?: string;
        quantity?: number;
        unitPrice?: number;
    }[];
    initialSelectedOrderedProductIds?: string[];
}

export interface AddCommentRequest {
    text?: string;
    status?: IssueStatus;
}

export const ISSUE_STATUS_CONFIG = {
    OPEN: {
        label: "Abierto",
        className: "bg-red-100 text-red-800"
    },
    IN_PROGRESS: {
        label: "En Progreso",
        className: "bg-orange-100 text-orange-800"
    },
    CLOSED: {
        label: "Cerrado",
        className: "bg-gray-200 text-gray-800"
    }
} as const;

export const ISSUE_WORKFLOW_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
    [IssueStatus.OPEN]: [IssueStatus.IN_PROGRESS, IssueStatus.CLOSED],
    [IssueStatus.IN_PROGRESS]: [IssueStatus.OPEN, IssueStatus.CLOSED],
    [IssueStatus.CLOSED]: [IssueStatus.OPEN],
};

export interface IssueWatcher {
    id: string;
    issueId: string;
    email: string;
    userId?: string;
    userName?: string;
    createdAt: string;
}

export interface DropWatcher {
    id: string;
    familyProductId: string;
    email: string;
    userId?: string;
    userName?: string;
    createdAt: string;
}


