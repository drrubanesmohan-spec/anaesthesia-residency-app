import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/zkiyqgfjlofxfzgnzkqk\.supabase\.co\/rest\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: { maxEntries: 200, maxAgeSeconds: 300 },
              networkTimeoutSeconds: 4,
            },
          },
        ],
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        name: 'Anaesthesia Residency',
        short_name: 'Residency',
        description: 'Anaesthesia Residency Program',
        theme_color: '#1a1a1a',
        background_color: '#eeede8',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/favicon.png', sizes: '192x192', type: 'image/png' },
          { src: '/favicon.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
