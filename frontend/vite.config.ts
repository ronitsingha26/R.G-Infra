import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // ─── Dev server proxy ─────────────────────────────────────────────────
  // In production, Express serves both the API and the built frontend,
  // so proxying is only needed during local development.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      // Proxy Socket.IO upgrade requests so hot-reload & sockets both work in dev
      '/socket.io': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        ws: true,
      },
    },
  },

  // ─── Production build ─────────────────────────────────────────────────
  build: {
    outDir: 'dist',
    sourcemap: false,        // Never expose source maps in production
    // minify defaults to 'oxc' in Vite 8 (via rolldown) — fastest available
    target: 'es2020',
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        // Split heavy vendor libs into separate chunks for better long-term caching.
        // Function form is used for Rollup/Vite type compatibility.
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'react-vendor'
          }
          if (id.includes('node_modules/framer-motion')) return 'motion-vendor'
          if (id.includes('node_modules/recharts'))      return 'chart-vendor'
          if (id.includes('node_modules/lucide-react'))  return 'icon-vendor'
        },
        // Deterministic filenames with content hash for cache-busting
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
  },
})
