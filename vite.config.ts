import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // GitHub Pages serves the site from /<repo>/ — the deploy workflow sets PAGES_BASE; dev and tests use /
  base: process.env.PAGES_BASE ?? '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  // Default build target (Baseline widely available) — every browser in it has WebGL2 + Web Audio.
  // No manualChunks: with Rolldown it pulled R3F into the lazy post-processing chunk and preloaded
  // it eagerly. Automatic splitting keeps dynamic imports (PostFX, sceneProbe) truly lazy.
});
