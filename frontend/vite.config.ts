import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core libraries
          'react-vendor': ['react', 'react-dom'],
          // React Flow and layout libraries
          'flow-vendor': ['@xyflow/react', '@dagrejs/dagre'],
          // Radix UI components
          'ui-vendor': [
            '@radix-ui/react-checkbox',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-slot',
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API requests to FastAPI backend
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // Proxy auth requests to FastAPI backend
      '/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
