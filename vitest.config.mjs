import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov', 'json-summary'],
            include: ['controllers/**', 'middleware/**', 'routes/**', 'utils/**', 'index.js'],
        },
    },
});
