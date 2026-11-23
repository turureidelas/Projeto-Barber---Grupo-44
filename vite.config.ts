import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Aliases (@domain, @application, ...) come from tsconfig.app.json — single source of truth.
    tsconfigPaths: true,
  },
  build: {
    rolldownOptions: {
      output: {
        // Libraries change less often than our code: separate chunks keep them cached
        // between deploys and keep every file under the 500 kB warning.
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules[/\\](react|react-dom|react-router|scheduler)[/\\]/,
              priority: 20,
            },
            {
              name: 'data',
              test: /node_modules[/\\](@tanstack|zod|react-hook-form|@hookform)[/\\]/,
              priority: 10,
            },
            { name: 'dates', test: /node_modules[/\\](date-fns|@date-fns)[/\\]/, priority: 10 },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.d.ts',
        'src/**/testing/**',
        'src/main/index.tsx',
      ],
      thresholds: {
        // The domain (availability engine) is the heart of the system.
        'src/domain/**': { statements: 100, branches: 100, functions: 100, lines: 100 },
        'src/application/**': { statements: 90, branches: 80, functions: 90, lines: 90 },
      },
    },
  },
});
