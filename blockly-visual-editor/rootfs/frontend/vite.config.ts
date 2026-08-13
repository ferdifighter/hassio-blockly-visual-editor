import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

function copyBlocklyMedia() {
  return {
    name: 'copy-blockly-media',
    buildStart() {
      const src = path.resolve('node_modules/blockly/media');
      const dest = path.resolve('public/media');
      if (!existsSync(src)) {
        return;
      }
      mkdirSync(dest, { recursive: true });
      cpSync(src, dest, { recursive: true });
    },
  };
}

export default defineConfig({
  plugins: [react(), copyBlocklyMedia()],
  base: './',
  build: {
    outDir: 'build',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8099',
    },
  },
  test: {
    environment: 'happy-dom',
  },
});
