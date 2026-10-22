import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  cacheDir: ".vite",

  plugins: [
    reactRouter(),
    tailwindcss(),
    tsconfigPaths(),
  ],

  server: {
    host: true,
    port: 5173,
    strictPort: true,
    watch: {
        usePolling: true,
        interval: 1000,
    },
  },

  optimizeDeps: {
    force: false,
  },

  test: {
    environment: "jsdom",
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage",
      include: ["app/**"],
    },
  },
});