import { describe, it, expect } from 'vitest';
import { meta } from './drops';

describe('drops route', () => {
    describe('meta', () => {
        it('returns the correct title and name meta tags', () => {
            const result = meta();
            expect(result).toEqual([
                { title: 'Yambo - Drops' },
                { name: 'Yambo - Drops', content: 'Yambo - Drops' },
            ]);
        });
    });
});
