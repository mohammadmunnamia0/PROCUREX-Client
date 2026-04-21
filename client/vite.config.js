import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VITE_CLIENT_FILE = path.join(__dirname, "node_modules", "vite", "dist", "client", "client.mjs");
const VITE_ENV_FILE = path.join(__dirname, "node_modules", "vite", "dist", "client", "env.mjs");
const VENDOR_IMPORT_MAP = {
  react: "/__vendor__/react.js",
  "react-dom": "/__vendor__/react-dom.js",
  "react-dom/client": "/__vendor__/react-dom-client.js",
  "react/jsx-dev-runtime": "/__vendor__/react-jsx-dev-runtime.js",
  "react/jsx-runtime": "/__vendor__/react-jsx-runtime.js",
  "react-router-dom": "/__vendor__/react-router-dom.js",
  "react-toastify": "/__vendor__/react-toastify.js",
  "react-icons/fi": "/__vendor__/react-icons-fi.js",
  recharts: "/__vendor__/recharts.js",
};

function normalizeSrcId(id) {
  if (!id) return null;

  const noQuery = id.split("?")[0];
  if (noQuery.startsWith("/src/")) return noQuery;

  const srcIndex = noQuery.indexOf("/src/");
  if (srcIndex >= 0) return noQuery.slice(srcIndex);

  return null;
}

function serveViteRuntimeInHashPath() {
  return {
    name: "serve-vite-runtime-in-hash-path",
    configureServer(server) {
      const hmrConfig = typeof server.config.server.hmr === "object" ? server.config.server.hmr : {};

      server.middlewares.use((req, res, next) => {
        const pathname = (req.url || "").split("?")[0];

        if (pathname.startsWith("/__vendor__/")) {
          const fileName = decodeURIComponent(pathname.slice("/__vendor__/".length));
          if (!fileName || fileName.includes("..")) {
            next();
            return;
          }

          try {
            const vendorFilePath = path.join(__dirname, "src", "vendor", fileName);
            const code = readFileSync(vendorFilePath, "utf8");
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/javascript");
            res.setHeader("Cache-Control", "no-cache");
            res.end(code);
          } catch (error) {
            next(error);
          }

          return;
        }

        if (pathname !== "/@vite/client" && pathname !== "/@vite/env") {
          next();
          return;
        }

        try {
          const requestHost = (req.headers.host || "127.0.0.1:3000").replace(/\/$/, "");
          const requestHostName = requestHost.split(":")[0] || "127.0.0.1";
          const configuredPort = hmrConfig.clientPort || hmrConfig.port || server.config.server.port || 3000;
          const configuredBase = hmrConfig.path || "/";
          const configuredProtocol = hmrConfig.protocol || null;
          const configuredHostName = hmrConfig.host || requestHostName;
          const directSocketHost = `${configuredHostName}:${configuredPort}${configuredBase}`;
          const wsToken = server.config.webSocketToken || "";

          const filePath = pathname === "/@vite/client" ? VITE_CLIENT_FILE : VITE_ENV_FILE;
          const rawCode = readFileSync(filePath, "utf8");
          const code = pathname === "/@vite/client"
            ? rawCode
              .replace("import '@vite/env';", "import '/@vite/env';")
              .replaceAll("__HMR_CONFIG_NAME__", JSON.stringify("vite"))
              .replaceAll("__BASE__", JSON.stringify("/"))
              .replaceAll("__SERVER_HOST__", JSON.stringify(requestHost))
              .replaceAll("__HMR_PROTOCOL__", configuredProtocol === null ? "null" : JSON.stringify(configuredProtocol))
              .replaceAll("__HMR_PORT__", JSON.stringify(configuredPort))
              .replaceAll("__HMR_HOSTNAME__", JSON.stringify(configuredHostName))
              .replaceAll("__HMR_BASE__", JSON.stringify(configuredBase))
              .replaceAll("__HMR_DIRECT_TARGET__", JSON.stringify(directSocketHost))
              .replaceAll("__WS_TOKEN__", JSON.stringify(wsToken))
              .replaceAll("__HMR_TIMEOUT__", "30000")
              .replaceAll("__HMR_ENABLE_OVERLAY__", "true")
            : `const __DEFINES__ = globalThis.__DEFINES__ || {};\n${rawCode}`;

          res.statusCode = 200;
          res.setHeader("Content-Type", "text/javascript");
          res.setHeader("Cache-Control", "no-cache");
          res.end(code);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

function resolveAndLoadSourceInHashPath() {
  const depByBundledFile = {
    "react.js": "react",
    "react-dom.js": "react-dom",
    "react-dom_client.js": "react-dom/client",
    "react_jsx-dev-runtime.js": "react/jsx-dev-runtime",
    "react_jsx-runtime.js": "react/jsx-runtime",
    "react-router-dom.js": "react-router-dom",
    "react-toastify.js": "react-toastify",
    "react-icons_fi.js": "react-icons/fi",
    "recharts.js": "recharts",
  };

  return {
    name: "resolve-and-load-source-in-hash-path",
    enforce: "pre",
    resolveId(source, importer) {
      if (VENDOR_IMPORT_MAP[source]) return VENDOR_IMPORT_MAP[source];
      if (source.startsWith("/__vendor__/")) return source;
      if (source.startsWith("/src/")) return source;
      if (source.startsWith("@/")) return `/src/${source.slice(2)}`;

      if ((source.startsWith("./") || source.startsWith("../")) && importer) {
        const normalizedImporter = normalizeSrcId(importer);
        if (normalizedImporter) {
          const resolved = path.posix.normalize(
            path.posix.join(path.posix.dirname(normalizedImporter), source)
          );
          if (resolved.startsWith("/src/")) return resolved;
        }
      }

      if (source.startsWith("/node_modules/.vite/deps/")) {
        const fileName = source.split("/").pop()?.split("?")[0] || "";
        const depName = depByBundledFile[fileName];
        if (depName && VENDOR_IMPORT_MAP[depName]) return VENDOR_IMPORT_MAP[depName];
      }

      return null;
    },
    load(id) {
      const normalizedVendorId = id.split("?")[0];
      if (normalizedVendorId.startsWith("/__vendor__/")) {
        const fileName = decodeURIComponent(normalizedVendorId.slice("/__vendor__/".length));
        if (!fileName || fileName.includes("..")) return null;

        const vendorPath = path.join(__dirname, "src", "vendor", fileName);
        try {
          return readFileSync(vendorPath, "utf8");
        } catch {
          return null;
        }
      }

      const normalizedId = normalizeSrcId(id);
      if (!normalizedId) return null;

      const filePath = path.join(__dirname, normalizedId.slice(1));
      try {
        return readFileSync(filePath, "utf8");
      } catch {
        return null;
      }
    },
  };
}

export default defineConfig({
  plugins: [serveViteRuntimeInHashPath(), resolveAndLoadSourceInHashPath(), react()],
  optimizeDeps: {
    noDiscovery: true,
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
