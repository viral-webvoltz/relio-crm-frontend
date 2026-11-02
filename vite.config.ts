import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// Production-only Content-Security-Policy (dev needs inline scripts for hot reload). The API origin comes from VITE_API_URL.
// frame-ancestors and HSTS cannot be set from a <meta> tag: add them as response headers on the host.
function contentSecurityPolicy(apiUrl: string): Plugin {
  const apiOrigin = apiUrl ? new URL(apiUrl).origin : ''
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    `connect-src 'self' ${apiOrigin}`.trim(),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
  return {
    name: 'csp-meta',
    apply: 'build',
    transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' }],
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), contentSecurityPolicy(loadEnv(mode, import.meta.dirname, 'VITE_').VITE_API_URL ?? '')],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  build: {
    rolldownOptions: {
      output: {
        // Framework code changes rarely; keeping it in its own chunk lets browsers cache it across app releases.
        codeSplitting: { groups: [{ name: 'vendor', test: /node_modules[\/](react|react-dom|react-router|react-router-dom|scheduler)[\/]/ }] },
      },
    },
  },
  server: { proxy: { '/api': 'http://localhost:4000' } },
}))
