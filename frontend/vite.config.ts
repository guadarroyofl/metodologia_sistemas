import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Configuración de Vite para el frontend.
 * - En desarrollo, el proxy reenvía /api y /media al backend local
 *   (http://127.0.0.1:8010) para evitar problemas de CORS y que las
 *   imágenes/recursos del backend se resuelvan correctamente.
 * - El destino puede sobreescribirse con la variable VITE_API_PROXY.
 */
export default defineConfig(({ mode }) => {
  // Carga variables de entorno del prefijo por defecto (todas) para este modo.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        // API REST: todas las llamadas /api/* van al backend.
        '/api': {
          target: env.VITE_API_PROXY || 'http://127.0.0.1:8010',
          changeOrigin: true,
        },
        // Archivos estáticos/media servidos por el backend (/media/*).
        '/media': {
          target: env.VITE_API_PROXY || 'http://127.0.0.1:8010',
          changeOrigin: true,
        },
      },
    },
    // Puerto para `vite preview` (build de producción local).
    preview: { port: 4173 },
  }
})
