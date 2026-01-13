import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [],
  base: mode === 'extension' ? './' : '/',
}))
