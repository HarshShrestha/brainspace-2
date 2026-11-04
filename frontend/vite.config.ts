import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@tests": fileURLToPath(new URL("./tests", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Same-origin in development too, so the session cookie behaves exactly as in production.
    proxy: { "/api": process.env.VITE_DEV_API_PROXY ?? "http://localhost:8000" },
  },
  preview: { proxy: { "/api": process.env.VITE_DEV_API_PROXY ?? "http://localhost:8000" } },
  build: { sourcemap: true, target: "es2022" },
});
