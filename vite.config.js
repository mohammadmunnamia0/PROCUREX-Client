import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Browser-only app: no API proxy. Relative base + hash routing let the built
// `dist/` run from any static host or sub-path.
//
// `vite build --mode standalone` additionally produces dist-standalone/PROCUREX.html:
// one self-contained file (JS + CSS inlined) that runs by double-clicking it,
// with no server and no internet connection.
export default defineConfig(({ mode }) => {
  const standalone = mode === "standalone";
  return {
    base: "./",
    plugins: [react(), standalone && inlineIntoSingleHtml()],
    // Keep the "#"-free junction path used by scripts/vite.js (see that file).
    resolve: {
      preserveSymlinks: true,
    },
    server: {
      port: 3000,
      open: true,
    },
    // Only scan this app's entry; the unrelated /client project has its own index.html.
    optimizeDeps: {
      entries: ["index.html"],
    },
    build: standalone
      ? {
          outDir: "dist-standalone",
          emptyOutDir: true,
          cssCodeSplit: false,
          modulePreload: false,
          assetsInlineLimit: Number.MAX_SAFE_INTEGER,
          rollupOptions: { output: { inlineDynamicImports: true } },
        }
      : {
          rollupOptions: {
            output: {
              manualChunks: {
                react: ["react", "react-dom", "react-router-dom"],
                charts: ["recharts"],
              },
            },
          },
        },
  };
});

/** Inlines the entry script and stylesheet into the HTML and emits it as PROCUREX.html. */
function inlineIntoSingleHtml() {
  return {
    name: "procurex-inline-single-html",
    enforce: "post",
    generateBundle(_options, bundle) {
      const html = bundle["index.html"];
      if (!html) return;
      let source = String(html.source);
      for (const [fileName, output] of Object.entries(bundle)) {
        const ref = fileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (output.type === "asset" && fileName.endsWith(".css")) {
          source = source.replace(new RegExp(`<link rel="stylesheet"[^>]*href="[^"]*${ref}"[^>]*>`), () => `<style>${output.source}</style>`);
          delete bundle[fileName];
        } else if (output.type === "chunk" && output.isEntry) {
          // "</script" inside the code would end the inline tag early.
          const code = output.code.replace(/<\/script/gi, "<\\/script");
          source = source.replace(new RegExp(`<script type="module"[^>]*src="[^"]*${ref}"[^>]*></script>`), () => `<script type="module">${code}</script>`);
          delete bundle[fileName];
        }
      }
      delete bundle["index.html"];
      this.emitFile({ type: "asset", fileName: "PROCUREX.html", source });
    },
  };
}
