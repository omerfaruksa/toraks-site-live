import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0', port: 3000 },
  preview: { host: '0.0.0.0', port: 3000 },
  build: {
    // Sayı dosyası tembel yüklenen ayrı bir parça (gzip ~150 KB); veri parçası
    // olduğu için 500 KB eşiği yanlış alarm veriyordu.
    chunkSizeWarningLimit: 700,
  },
})
