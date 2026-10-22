import { describe, it, expect, vi } from 'vitest';
import { meta } from './drops';

vi.mock("~/i18n/config", () => ({
    default: {
        t: (key: string) => {
            const map: Record<string, string> = {
                'merch.dropMetaTitle': 'Yambo - Colecciones',
            };
            return map[key] || key;
        },
        language: 'es',
        changeLanguage: vi.fn(),
    },
}));

describe('drops route', () => {
    describe('meta', () => {
        it('returns the correct title and name meta tags', () => {
            const result = meta();
            expect(result).toEqual([
                { title: 'Yambo - Colecciones' },
                { name: 'description', content: 'Yambo - Colecciones' },
            ]);
        });
    });
});
