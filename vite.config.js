import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy hacia optcgapi.com para evitar problemas de CORS en desarrollo/preview.
const proxy = {
  '/optcg': {
    target: 'https://optcgapi.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/optcg/, ''),
  },
}

export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
})
