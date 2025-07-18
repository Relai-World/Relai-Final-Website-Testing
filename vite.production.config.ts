import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Production config without development-only plugins
export default defineConfig({
  plugins: [
    react({
      // Disable fast refresh in production
      fastRefresh: false,
      // Disable babel transforms that cause preamble issues
      babel: {
        parserOpts: {
          plugins: []
        }
      }
    })
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
    hmr: false
  }
});