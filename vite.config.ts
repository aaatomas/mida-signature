import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const oauthTarget = env.VITE_DEV_OAUTH_PROXY_TARGET || ''

  return {
    plugins: [react()],
    server: {
      proxy: oauthTarget
        ? {
            '/oauth2': {
              target: oauthTarget,
              changeOrigin: true,
            },
          }
        : undefined,
    },
  }
})
