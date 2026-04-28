import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { orderService } from './orderService';
import type { Order } from '~/types/order';

const mockOrder: Order = {
    id: 'ORD001',
    user: { id: 'U1', name: 'Test User', email: 'test@example.com' },
    status: 'PENDING_PAYMENT',
    createdAt: '2024-01-01T00:00:00Z',
    hasOpenIssues: false,
    products: [],
};

describe('OrderService', () => {
    let putSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        putSpy = vi.spyOn(orderService as any, 'put');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('confirmProductDelivery', () => {
        it('calls PUT with the correct endpoint and returns the updated order', async () => {
            putSpy.mockResolvedValue(mockOrder);

            const result = await orderService.confirmProductDelivery('ORD001', 'OP001');

            expect(putSpy).toHaveBeenCalledWith(
                '/orders/my/ORD001/products/OP001/deliver',
                {}
            );
            expect(result).toEqual(mockOrder);
        });

        it('propagates errors from the API', async () => {
            const error = new Error('Forbidden');
            putSpy.mockRejectedValue(error);

            await expect(
                orderService.confirmProductDelivery('ORD001', 'OP001')
            ).rejects.toThrow('Forbidden');
        });
    });

    describe('cancelMyOrder', () => {
        it('calls PUT with the cancel endpoint', async () => {
            putSpy.mockResolvedValue(mockOrder);

            const result = await orderService.cancelMyOrder('ORD001');

            expect(putSpy).toHaveBeenCalledWith('/orders/my/ORD001/cancel', {});
            expect(result).toEqual(mockOrder);
        });
    });

    describe('getMyOrders', () => {
        let getSpy: ReturnType<typeof vi.spyOn>;

        beforeEach(() => {
            getSpy = vi.spyOn(orderService as any, 'get');
        });

        it('calls GET with default pagination', async () => {
            const mockResponse = { content: [mockOrder], page: { totalElements: 1, totalPages: 1, number: 0, size: 50 } };
            getSpy.mockResolvedValue(mockResponse);

            const result = await orderService.getMyOrders();

            expect(getSpy).toHaveBeenCalledWith(expect.stringContaining('/orders/my?'));
            expect(result).toEqual(mockResponse);
        });

        it('appends status filters when provided', async () => {
            const mockResponse = { content: [], page: { totalElements: 0, totalPages: 0, number: 0, size: 50 } };
            getSpy.mockResolvedValue(mockResponse);

            await orderService.getMyOrders(0, 50, undefined, undefined, ['PENDING_PAYMENT', 'CLOSED']);

            const calledUrl = getSpy.mock.calls[0][0] as string;
            expect(calledUrl).toContain('status=PENDING_PAYMENT');
            expect(calledUrl).toContain('status=CLOSED');
        });
    });
});
