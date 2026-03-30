import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // React i Tailwind są wymagane – nie usuwaj
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ do src
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],

 
  server: {
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:30080',
      changeOrigin: true,
      secure: false,
    },
  },
},
})
