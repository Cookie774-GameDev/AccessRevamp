import { defineConfig } from 'vite';

// Netlify and the local production preview serve the framework-independent SPA.
// The vinext build remains alongside it for Sites/Cloudflare deployment.
export default defineConfig({
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: false,
  },
});
