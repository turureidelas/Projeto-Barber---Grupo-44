import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Aliases (@domain, @application, ...) come from tsconfig.app.json — single source of truth.
    tsconfigPaths: true,
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
      },
    },
  },
});
