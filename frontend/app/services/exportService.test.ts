import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExportService } from './exportService';

describe('ExportService', () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    beforeEach(() => {
        URL.createObjectURL = vi.fn(() => 'blob:download-url');
        URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
        URL.createObjectURL = originalCreateObjectURL;
        URL.revokeObjectURL = originalRevokeObjectURL;
        vi.restoreAllMocks();
    });

    it('builds export query and downloads with filename from content-disposition', async () => {
        const service = new ExportService() as any;
        service.axiosInstance = {
            get: vi.fn().mockResolvedValue({
                data: new Uint8Array([1, 2, 3]),
                headers: {
                    'content-disposition': 'attachment; filename="reporte-fabrica.xlsx"',
                },
            }),
        };

        const appendSpy = vi.spyOn(document.body, 'appendChild');
        const removeSpy = vi.spyOn(document.body, 'removeChild');
        const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

        await service.exportOrders(['drop-1', 'drop-2'], 'FACTORY', 'PENDING_PRODUCTS');

        expect(service.axiosInstance.get).toHaveBeenCalledWith(
            '/orders/export?dropIds=drop-1&dropIds=drop-2&reportType=FACTORY&productStatusFilter=PENDING_PRODUCTS',
            { responseType: 'blob' },
        );

        expect(appendSpy).toHaveBeenCalled();
        expect(removeSpy).toHaveBeenCalled();
        expect(clickSpy).toHaveBeenCalled();
        expect(URL.createObjectURL).toHaveBeenCalled();
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:download-url');
    });

    it('uses default filename when content-disposition is missing', async () => {
        const service = new ExportService() as any;
        service.axiosInstance = {
            get: vi.fn().mockResolvedValue({
                data: new Uint8Array([4, 5, 6]),
                headers: {},
            }),
        };

        let createdLink: any = null;
        vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
            const el = document.createElementNS('http://www.w3.org/1999/xhtml', tagName) as any;
            if (tagName.toLowerCase() === 'a') {
                createdLink = el as HTMLAnchorElement;
            }
            return el;
        });

        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

        await service.exportOrders([], 'FULL');

        expect(service.axiosInstance.get).toHaveBeenCalledWith('/orders/export?reportType=FULL', { responseType: 'blob' });
        if (!createdLink) {
            throw new Error('Expected anchor element to be created');
        }
        expect(createdLink.download).toMatch(/^fabricacion_\d{4}-\d{2}-\d{2}\.xlsx$/);
    });
});
