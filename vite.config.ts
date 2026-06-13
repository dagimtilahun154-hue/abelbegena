import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from "path"

const enableBasicSsl =
  process.env.npm_lifecycle_event === "dev:https" ||
  process.env.VITE_DEV_HTTPS === "true"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), ...(enableBasicSsl ? [basicSsl()] : [])],
  server: {
    host: "0.0.0.0",
    watch: {
      ignored: ['**/attend/**']
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
