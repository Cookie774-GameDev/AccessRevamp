import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    sourcemap: true,
    cssCodeSplit: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
