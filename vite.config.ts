import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Cache all static assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Serve cached app shell while network fetches update
        navigateFallback: 'index.html',
        // Cache Supabase API responses for 5 min, fall back to cache if network is slow
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
          { src: '/vite.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/vite.svg', sizes: '512x512', type: 'image/svg+xml' },
        ],
      },
    }),
  ],
})
