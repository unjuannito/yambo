import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    host: true, // Listen on all addresses, including LAN and public addresses
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true, // Enable polling for file changes (important for Docker/WSL)
      interval: 100, // Check for changes every 100ms
    },
    hmr: {
      host: 'localhost', // HMR host
      port: 5173,
    },
  },
});
