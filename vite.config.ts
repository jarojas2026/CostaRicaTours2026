import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png'],
      manifest: {
        id: '/',
        name: 'Costa Rica Tours',
        short_name: 'CR Tours',
        description: 'Explore and book the best tours in Costa Rica.',
        theme_color: '#041711',
        background_color: '#041711',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000,
        cleanupOutdatedCaches: true,
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,jpg,jpeg}'],
        // Lazy operational/admin surfaces are fetched only when requested.
        // Keeping them out of install-time precache reduces PWA cold-start bytes
        // without removing any capability from the application.
        globIgnores: [
          '**/AdminDashboard-*.js',
          '**/AutonomousOperationsPage-*.js',
          '**/EmailOperationsPage-*.js',
          '**/GoogleWorkspaceHub-*.js',
          '**/vendor-pdf-*.js',
        ],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'unsplash-images',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Media metadata is safe to cache briefly. Availability, bookings,
            // payments and admin endpoints are intentionally never cached.
            urlPattern: /\/api\/tours\/[^/]+\/media(?:\?.*)?$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'tour-media-metadata',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60,
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          }
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    })],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 900,
      // PDF generation is loaded only after the traveler explicitly requests it.
      // Vite otherwise preloads this ~600 kB async vendor chunk from index.html,
      // paying the network cost on every visit even when no PDF is generated.
      modulePreload: {
        resolveDependencies: (_filename, deps) => deps.filter(dep => !dep.includes('vendor-pdf-')),
      },
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return;
            if (id.includes('firebase') || id.includes('@firebase')) return 'vendor-firebase';
            if (id.includes('leaflet') || id.includes('@vis.gl') || id.includes('react-google-maps')) return 'vendor-maps';
            if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf';
            if (id.includes('motion') || id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/')) return 'vendor-react';
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
