import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages serves the app from /06-Exchange-rate-API/
  base: command === 'build' ? '/06-Exchange-rate-API/' : '/',
}))
