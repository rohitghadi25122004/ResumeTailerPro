import { handleGemini } from "./gemini.mjs";

/**
 * Vite plugin: exposes the /api/gemini proxy during `npm run dev`.
 * The key is read from process.env (loaded from .env by vite.config), so it
 * lives only in the Node dev process — it is never part of the client bundle.
 */
export function geminiApiPlugin() {
  return {
    name: "gemini-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const handled = await handleGemini(req, res).catch(() => false);
        if (!handled) next();
      });
    },
  };
}
