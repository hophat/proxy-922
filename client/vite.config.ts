import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  publicDir: 'public', // Copy files from public directory to dist
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    minify: 'esbuild', // esbuild nhanh hơn và tạo bundle nhỏ hơn
    sourcemap: false, // Tắt source maps để giảm kích thước
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    // Tối ưu assets
    assetsInlineLimit: 4096, // Inline assets nhỏ hơn 4KB
  },
  server: {
    port: 5173,
  },
});

