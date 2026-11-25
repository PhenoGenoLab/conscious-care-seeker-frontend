import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const rawBasePath = env.VITE_BASE_PATH ?? "/";
  const base = rawBasePath.endsWith("/") ? rawBasePath : `${rawBasePath}/`;

  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "src") },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: process.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8000",
          changeOrigin: true,
        },
      },
    },
  };
});
