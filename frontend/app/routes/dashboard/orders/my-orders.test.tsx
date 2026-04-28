import { describe, it, expect } from 'vitest';
import { meta } from './my-orders';

describe('my-orders route', () => {
    describe('meta', () => {
        it('returns the correct title and description meta tags', () => {
            const result = meta({} as any);
            expect(result).toEqual([
                { title: 'Yambo - Mis Pedidos' },
                { name: 'description', content: 'Historial de mis pedidos' },
            ]);
        });
    });
});
