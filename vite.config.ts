/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { seedDesignPlugin } from '@seed-design/vite-plugin'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // Dark-only app: inject SEED's theming script (data-seed-color-mode="dark-only")
    // and a matching `color-scheme: dark` meta so SEED tokens resolve to dark.
    seedDesignPlugin({ colorMode: 'dark-only' }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'FitLog',
        short_name: 'FitLog',
        description: '운동 기록 · 루틴 관리',
        theme_color: '#0f1c1a',
        background_color: '#0f1c1a',
        display: 'standalone',
        start_url: '/',
        lang: 'ko',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/ads\.txt$/],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    // SEED recipe `.mjs` modules side-effect-import their `.css`; inline the
    // packages so Vite (not Node) resolves those imports under Vitest.
    server: {
      deps: {
        inline: [/@seed-design\//],
      },
    },
  },
})
