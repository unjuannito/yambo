import { ApiService } from './apiService';

export interface CreateOrderProduct {
    productId: string;
    quantity: number;
    configuration?: string;
}

export interface OrderProduct {
    id: string;
    productId: string;
    productName?: string;
    quantity: number;
    price: number;
    configuration: string;
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
    products: OrderProduct[];
}

export interface CreateOrderRequest {
    products: CreateOrderProduct[];
}

export interface UpdateOrderStatusRequest {
    status: string;
}

export interface OrderResponse {
    id: string;
    user: UserInfo;
    status: string;
    createdAt: string;
    products: OrderProduct[];
}

export class OrderService extends ApiService {
    public async getAllOrders(page = 0, size = 20, customerId?: string, status?: string): Promise<{ content: Order[]; page: { totalElements: number; totalPages: number; number: number; size: number } }> {
        const params = new URLSearchParams({
            page: page.toString(),
            size: size.toString(),
        });
        if (customerId) params.append('customerId', customerId);
        if (status) params.append('status', status);

        const response = await this.get<{ content: Order[]; page: { totalElements: number; totalPages: number; number: number; size: number } }>(`/orders?${params}`);
        return response;
    }

    public async getOrder(id: string): Promise<Order> {
        return await this.get<Order>(`/orders/${id}`);
    }

    public async createOrder(request: CreateOrderRequest): Promise<OrderResponse> {
        return await this.post<OrderResponse, CreateOrderRequest>('/orders', request);
    }

    public async updateOrderStatus(id: string, status: string): Promise<Order> {
        return await this.put<Order, UpdateOrderStatusRequest>(`/orders/${id}/status`, { status });
    }

    public async deleteOrder(id: string): Promise<void> {
        return await this.delete<void>(`/orders/${id}`);
    }

    public async getMyOrders(): Promise<Order[]> {
        return await this.get<Order[]>('/orders/my');
    }
}

export const orderService = new OrderService();