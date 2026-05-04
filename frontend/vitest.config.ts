import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        environment: 'jsdom',
        passWithNoTests: true,
        setupFiles: ['./vitest.setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['lcov', 'text'],
            reportsDirectory: 'coverage',
            include: ['app/**'],
            exclude: ['app/**/*.test.ts', 'app/**/*.test.tsx', 'app/**/*.spec.ts', 'app/**/*.spec.tsx'],
        },
    },
});
