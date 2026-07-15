/**
 * Mobile / Capacitor build config.
 *
 * Produces a plain static SPA in `dist/mobile` (with `index.html`) so
 * `npx cap sync` can package Android + iOS shells. Kept intentionally
 * separate from `vite.config.ts` (SSR + Nitro) to avoid regressing the
 * production web deployment.
 *
 *   bun run build:mobile   # emits dist/mobile/index.html + hashed assets
 *   npx cap sync           # copies dist/mobile into android/ + ios/
 */
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import fs from "node:fs";
import path from "node:path";

// Rename Vite's emitted `index.mobile.html` → `index.html` so Capacitor
// finds the entry point inside `dist/mobile/`.
const renameMobileHtml = (): Plugin => ({
  name: "burg-rename-mobile-html",
  apply: "build",
  closeBundle() {
    const out = path.resolve(__dirname, "dist/mobile");
    const src = path.join(out, "index.mobile.html");
    const dest = path.join(out, "index.html");
    if (fs.existsSync(src)) fs.renameSync(src, dest);
  },
});

export default defineConfig({
  plugins: [
    // File-based routing — same conventions as the SSR build, no Start/Nitro.
    TanStackRouterVite({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: path.resolve(__dirname, "src/routes"),
      generatedRouteTree: path.resolve(__dirname, "src/routeTree.gen.ts"),
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
    renameMobileHtml(),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-query"],
  },
  define: {
    // Neutralise TanStack Start's server-only detection inside client code.
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production"),
  },
  build: {
    outDir: "dist/mobile",
    emptyOutDir: true,
    target: "es2020",
    sourcemap: false,
    minify: "esbuild",
    cssMinify: true,
    assetsInlineLimit: 4096,
    rollupOptions: {
      input: path.resolve(__dirname, "index.mobile.html"),
      output: {
        // Preserve asset hashing + code splitting for cache-busting inside
        // the WebView.
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  server: { port: 8080, host: true },
});
