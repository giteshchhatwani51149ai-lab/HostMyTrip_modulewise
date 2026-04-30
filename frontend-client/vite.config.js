import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('leaflet') || id.includes('react-leaflet')) return 'vendor-leaflet';
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('/zod/')) return 'vendor-forms';
          if (id.includes('date-fns') || id.includes('react-day-picker')) return 'vendor-date';
          if (id.includes('lucide-react') || id.includes('sonner') || id.includes('canvas-confetti')) return 'vendor-ui';
          if (id.includes('react-dom') || id.includes('react-router-dom') || (id.includes('/react/') && !id.includes('react-hook'))) return 'vendor-react';
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
