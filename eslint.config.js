import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

// Architecture Dependency Rules (IMPLEMENTATION_PLAN §4). A layer may only import layers below it.
// The regex matches both relative ("../animation/x", "../../animation/x") and alias ("@/animation/x") imports.
const layer = (...folders) => `^(?:@/|(?:\\.\\./)+)(?:${folders.join('|')})(?:/|$)`;

const restrict = (files, patterns) => ({
  files,
  rules: {
    '@typescript-eslint/no-restricted-imports': ['error', { patterns }],
  },
});

const PURE_TS = {
  group: [
    'react',
    'react-dom',
    'react/*',
    'react-dom/*',
    '@react-three/*',
    'three',
    'three/*',
    'zustand',
    'zustand/*',
    'gsap',
    'gsap/*',
  ],
  message: 'This layer is pure TypeScript: no React, three, zustand or gsap.',
};

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'public', 'test-results', 'playwright-report'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      // Classic hook rules only: react-hooks 7's `recommended` adds React Compiler rules (e.g. immutability),
      // which flag R3F's intended mutation of three objects. The project does not use React Compiler (§2).
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // L0 game/: chess truth, only chess.js
  restrict(
    ['src/game/**/*.ts'],
    [
      {
        regex: layer('experience', 'effects', 'audio', 'store', 'animation', 'scene', 'ui', 'app', 'dev'),
        message: 'L0 game/ cannot import higher layers.',
      },
      PURE_TS,
    ],
  ),

  // L1 experience/: authored data + resolver, imports game/ only
  restrict(
    ['src/experience/**/*.ts'],
    [
      {
        regex: layer('effects', 'audio', 'store', 'animation', 'scene', 'ui', 'app', 'dev'),
        message: 'L1 experience/ may only import game/.',
      },
      PURE_TS,
    ],
  ),

  // L2 effects/: imperative three.js primitives
  restrict(
    ['src/effects/**/*.ts'],
    [
      {
        regex: layer('audio', 'store', 'animation', 'scene', 'ui', 'app', 'dev'),
        message: 'L2 effects/ cannot import siblings or higher layers.',
      },
      {
        group: ['react', 'react-dom', '@react-three/*', 'zustand', 'zustand/*', 'gsap', 'gsap/*'],
        message: 'L2 effects/ is plain three.js — timing belongs to the Director.',
      },
    ],
  ),

  // L2 audio/: Web Audio only
  restrict(
    ['src/audio/**/*.ts'],
    [
      {
        regex: layer('effects', 'store', 'animation', 'scene', 'ui', 'app', 'dev'),
        message: 'L2 audio/ cannot import siblings or higher layers.',
      },
      PURE_TS,
    ],
  ),

  // L2 store/: vanilla zustand
  restrict(
    ['src/store/**/*.ts'],
    [
      {
        regex: layer('effects', 'audio', 'animation', 'scene', 'ui', 'app', 'dev'),
        message: 'L2 store/ cannot import siblings or higher layers.',
      },
      {
        group: ['react', 'react-dom', '@react-three/*', 'three', 'three/*', 'gsap', 'gsap/*'],
        message: 'L2 store/ is a vanilla zustand store.',
      },
    ],
  ),

  // L3 animation/: Director + runtime, no React
  restrict(
    ['src/animation/**/*.ts'],
    [
      { regex: layer('scene', 'ui', 'app', 'dev'), message: 'L3 animation/ cannot import scene/, ui/, app/ or dev/.' },
      {
        group: ['react', 'react-dom', 'react/*', '@react-three/*'],
        message: 'L3 animation/ is imperative GSAP + three — no React.',
      },
    ],
  ),

  // L4 scene/: R3F mounting
  restrict(
    ['src/scene/**/*.{ts,tsx}'],
    [{ regex: layer('ui', 'app', 'dev'), message: 'L4 scene/ cannot import ui/, app/ or dev/.' }],
  ),

  // L5 ui/: React DOM. Commands reach the Director through DirectorCommands (types only).
  restrict(
    ['src/ui/**/*.{ts,tsx}'],
    [
      {
        regex: layer('effects', 'audio', 'scene', 'app', 'dev'),
        message: 'L5 ui/ cannot import effects/, audio/, scene/, app/ or dev/.',
      },
      {
        regex: layer('animation'),
        allowTypeImports: true,
        message: 'L5 ui/ may only import types from animation/ (use useDirector()).',
      },
      { group: ['three', 'three/*', '@react-three/*'], message: 'L5 ui/ is DOM only.' },
    ],
  ),
);
