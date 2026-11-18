import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Clean Architecture boundaries: dependencies always point inward.
 * Each layer lists what it must NOT import (by alias or by relative path).
 */
const layerPatterns = (layer) => [`@${layer}/*`, `**/${layer}/**`];

const UI_AND_IO_PACKAGES = [
  'react',
  'react-dom',
  'react-dom/*',
  'react-router',
  'react-router/*',
  '@tanstack/*',
  'react-hook-form',
  '@hookform/*',
  'lucide-react',
  'zod',
  'zod/*',
];

const boundary = (files, forbiddenLayers, forbiddenPackages, message) => ({
  files,
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: [...forbiddenLayers.flatMap(layerPatterns), ...forbiddenPackages],
            message,
          },
        ],
      },
    ],
  },
});

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'node_modules']),

  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // LGPD: never log personal data. Use a dedicated logger (no PII) if ever needed.
      'no-console': 'error',
      // Env vars are read only in src/main/config (composition root).
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.type='MetaProperty'][property.name='env']",
          message: 'Leia variáveis de ambiente apenas em src/main/config/env.ts.',
        },
      ],
    },
  },

  {
    files: ['src/main/config/**/*.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },

  {
    files: ['**/*.js', 'vite.config.ts'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },

  boundary(
    ['src/domain/**/*.{ts,tsx}'],
    ['application', 'infrastructure', 'presentation', 'main'],
    UI_AND_IO_PACKAGES,
    'domain é puro: não importa outras camadas, React, I/O ou libs de UI.',
  ),
  boundary(
    ['src/application/**/*.{ts,tsx}'],
    ['infrastructure', 'presentation', 'main'],
    UI_AND_IO_PACKAGES,
    'application só depende de domain (e shared).',
  ),
  boundary(
    ['src/infrastructure/**/*.{ts,tsx}'],
    ['presentation', 'main'],
    UI_AND_IO_PACKAGES.filter((pkg) => pkg !== 'zod' && pkg !== 'zod/*'),
    'infrastructure implementa portas de application; não conhece a UI.',
  ),
  boundary(
    ['src/presentation/**/*.{ts,tsx}'],
    ['infrastructure', 'main'],
    [],
    'presentation conversa só com casos de uso (via hooks/DI), nunca com infrastructure.',
  ),
  boundary(
    ['src/shared/**/*.{ts,tsx}'],
    ['domain', 'application', 'infrastructure', 'presentation', 'main'],
    UI_AND_IO_PACKAGES,
    'shared não depende de nenhuma camada do projeto.',
  ),

  prettier,
]);
