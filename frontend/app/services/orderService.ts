import { ApiService } from './apiService';
import type { Order, OrderProduct, UserInfo } from '~/types/order';

export type { Order, OrderProduct, UserInfo } from '~/types/order';

export interface CreateOrderProduct {
    productId: string;
    quantity: number;
    configuration?: string;
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
    public async getAllOrders(page = 0, size = 20, orderId?: string, customerName?: string, customerId?: string, status?: string[], startDate?: string, endDate?: string): Promise<{ content: Order[]; page: { totalElements: number; totalPages: number; number: number; size: number } }> {
        const params = new URLSearchParams({
            page: page.toString(),
            size: size.toString(),
        });
        if (orderId) params.append('orderId', orderId);
        if (customerName) params.append('customerName', customerName);
        if (customerId) params.append('customerId', customerId);
        if (status && status.length > 0) {
            for (const s of status) params.append('status', s);
        }
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

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

    public async getMyOrders(page = 0, size = 50, startDate?: string, endDate?: string, status?: string[]): Promise<{ content: Order[]; page: { totalElements: number; totalPages: number; number: number; size: number } }> {
        const params = new URLSearchParams({
            page: page.toString(),
            size: size.toString(),
        });
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (status && status.length > 0) {
            for (const s of status) params.append('status', s);
        }
        return await this.get<{ content: Order[]; page: { totalElements: number; totalPages: number; number: number; size: number } }>(`/orders/my?${params}`);
    }

    public async cancelMyOrder(id: string): Promise<Order> {
        return await this.put<Order, Record<string, never>>(`/orders/my/${id}/cancel`, {});
    }

    public async confirmProductDelivery(orderId: string, orderProductId: string): Promise<Order> {
        return await this.put<Order, Record<string, never>>(`/orders/my/${orderId}/products/${orderProductId}/deliver`, {});
    }

    public async uploadReceipt(id: string, fileId: string): Promise<Order> {
        return await this.put<Order, { fileId: string }>(`/orders/my/${id}/receipt`, { fileId });
    }

    public async adminUploadReceipt(id: string, fileId: string): Promise<Order> {
        return await this.put<Order, { fileId: string }>(`/orders/${id}/receipt`, { fileId });
    }
}

export const orderService = new OrderService();