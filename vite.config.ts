import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Göreli taban: site kök dizinde de (Cloudflare, Vercel) alt yolda da (GitHub Pages
  // /depo-adi/) aynı çıktıyla çalışır.
  base: './',
  plugins: [react()],
  server: { host: '0.0.0.0', port: 3000 },
  preview: { host: '0.0.0.0', port: 3000 },
  build: {
    // Sayı dosyası tembel yüklenen ayrı bir parça (gzip ~150 KB); veri parçası
    // olduğu için 500 KB eşiği yanlış alarm veriyordu.
    chunkSizeWarningLimit: 700,
  },
})
