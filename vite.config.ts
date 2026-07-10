import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [
        '/Users/happyboy/Documents/ai-website',
        '/Volumes/2TB-NVMe/work/ai-website',
        '/Volumes/2TB-NVMe/work/image2/codex-keyframes-tutorial',
      ],
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
