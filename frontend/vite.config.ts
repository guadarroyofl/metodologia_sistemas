import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // En desarrollo, todo lo que empiece con /api se reenvía al back (FastAPI, puerto 8000).
    // Así el front y el back parecen estar en el mismo lugar y no hay problemas de CORS.
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
