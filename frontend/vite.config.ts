import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** Serves /api/chat during `npm run dev` using the same handler Vercel runs in production. Reads .env for GEMINI_API_KEY. */
function apiDev(): Plugin {
  return {
    name: 'aimverse-api-dev',
    configureServer(server) {
      Object.assign(process.env, loadEnv('development', process.cwd(), ''))
      for (const route of ['chat', 'contact']) {
        server.middlewares.use(`/api/${route}`, async (req, res) => {
          try {
            const mod = await server.ssrLoadModule(`/api/${route}.ts`)
            await (mod.default as (a: unknown, b: unknown) => Promise<void>)(req, res)
          } catch (e) {
            console.error(`[api/${route} dev]`, e)
            res.statusCode = 500
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ error: 'Dev API error — check the terminal.' }))
          }
        })
      }
    },
  }
}

export default defineConfig({ plugins: [react(), apiDev()], build: { chunkSizeWarningLimit: 1200 } })
