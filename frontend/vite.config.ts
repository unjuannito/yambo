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
      interval: 500, // Check for changes every 500ms
    },
    hmr: {
      host: '0.0.0.0', // HMR host
      port: 5173,
    },
  },
});
