import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['dist', '.cache', 'fixtures', 'public', 'flake-lab/out', 'node_modules', '.superpowers', '.impeccable', 'docs'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // The engine is pure TypeScript: no UI, no DOM, no network (spec 19.1).
    files: ['src/engine/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['react', 'react-dom', 'react/*', 'react-dom/*', '**/ui/**'], message: 'src/engine must not import UI code.' }] },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'indexedDB', 'fetch'],
    },
  },
);
