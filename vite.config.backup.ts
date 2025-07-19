import { defineConfig, PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const disableReactRefresh = true;

export default defineConfig(() => {
  const plugins: PluginOption[] = [
    disableReactRefresh
      ? {
          name: 'react-stub',
          config() {
            return {
              esbuild: {
                jsx: 'automatic',
                jsxImportSource: 'react'
              }
            }
          }
        }
      : react(),
    !disableReactRefresh ? runtimeErrorOverlay() : undefined,
    themePlugin(),
  ];

  // Add cartographer plugin synchronously if needed
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined &&
    !disableReactRefresh
  ) {
    try {
      // Try to require it synchronously 
      const cartographerModule = require("@replit/vite-plugin-cartographer");
      if (cartographerModule && cartographerModule.cartographer) {
        plugins.push(cartographerModule.cartographer());
      }
    } catch (error) {
      console.warn('Cartographer plugin not available');
    }
  }

  return {
    plugins: plugins.filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@shared": path.resolve(__dirname, "shared"),
        "@assets": path.resolve(__dirname, "attached_assets"),
      },
    },
    root: path.resolve(__dirname, "client"),
    build: {
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: true,
      rollupOptions: {
        input: path.resolve(__dirname, "client", "index.html"),
      },
    },
    server: {
      hmr: {
        port: 5001,
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
  };
});