import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";

// Deployment configuration that fixes React preamble error
export default defineConfig({
  plugins: [
    react({
      // Disable all React plugin transforms in deployment
      fastRefresh: false,
      babel: false,
      jsxRuntime: 'classic',
      jsxImportSource: undefined,
      // Disable all plugin features to avoid preamble issues
      include: [],
      exclude: /./
    }),
    themePlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve("client", "src"),
      "@shared": path.resolve("shared"),
      "@assets": path.resolve("attached_assets"),
    },
  },
  root: path.resolve("client"),
  build: {
    outDir: path.resolve("dist/public"),
    emptyOutDir: true,
  },
  server: {
    middlewareMode: true,
    hmr: false,
  },
  optimizeDeps: {
    // Disable dependency optimization to avoid issues
    disabled: true
  }
});