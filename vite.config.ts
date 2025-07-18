import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Force disable React Fast Refresh to fix preamble error in deployment
const disableReactRefresh = true;

export default defineConfig({
  plugins: [
    disableReactRefresh ? 
      // Minimal React plugin configuration for deployment
      {
        name: 'react-stub',
        config() {
          return {
            esbuild: {
              jsx: 'automatic',
              jsxImportSource: 'react'
            }
          }
        }
      } :
      // Full React plugin for development
      react(),
    !disableReactRefresh && runtimeErrorOverlay(),
    themePlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined &&
    !disableReactRefresh
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
});