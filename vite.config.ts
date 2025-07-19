import { defineConfig, PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const disableReactRefresh = true;
export default defineConfig(async () => {
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
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined &&
    !disableReactRefresh
  ) {
    const { cartographer } = await import("@replit/vite-plugin-cartographer");
    plugins.push(cartographer());
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
    },
  };
});