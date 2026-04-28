export interface OrderProduct {
    id: string;
    productId: string;
    productName?: string;
    quantity: number;
    price: number;
    configuration: string;
    status: string;
}

export interface UserInfo {
    id: string;
    name: string;
    email: string;
}

export interface Order {
    id: string;
    user: UserInfo;
    status: string;
    createdAt: string;
    closedAt?: string;
    hasOpenIssues: boolean;
    receiptFileId?: string;
    products: OrderProduct[];
}
