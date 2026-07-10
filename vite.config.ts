import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:4319',
    },
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
    exclude: [...configDefaults.exclude, '**/.worktrees/**'],
    setupFiles: './src/test/setup.ts',
  },
})
