import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl = env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    server: {
      host: "127.0.0.1",
      port: 5173,
      // Proxy all backend routes so the browser never makes cross-origin
      // requests — no CORS issues, works with any backend port.
      proxy: {
        "/health":     { target: backendUrl, changeOrigin: true },
        "/upload":     { target: backendUrl, changeOrigin: true },
        "/search":     { target: backendUrl, changeOrigin: true },
        "/script":     { target: backendUrl, changeOrigin: true },
        "/status":     { target: backendUrl, changeOrigin: true },
        "/videos":     { target: backendUrl, changeOrigin: true },
        "/thumbnails": { target: backendUrl, changeOrigin: true },
      },
    },
  };
});
