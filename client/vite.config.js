import { defineConfig } from "vite";

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || "http://localhost:1337";

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      "/api": apiProxyTarget
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
