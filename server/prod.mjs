// Production server: serves the built `dist/` folder and the /api/gemini proxy.
// Run: npm run build && npm start
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { handleGemini } from "./gemini.mjs";

// Load .env into process.env (Node 20.6+).
try {
  process.loadEnvFile(new URL("../.env", import.meta.url));
} catch {
  /* no .env — AI will report "not configured" */
}

const root = fileURLToPath(new URL("../dist", import.meta.url));
const PORT = process.env.PORT || 4173;

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const server = createServer(async (req, res) => {
  if ((req.url || "").startsWith("/api/")) {
    const handled = await handleGemini(req, res).catch(() => false);
    if (!handled) {
      res.statusCode = 404;
      res.end("Not found");
    }
    return;
  }

  // Static files with SPA fallback to index.html.
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  let filePath = normalize(join(root, urlPath === "/" ? "index.html" : urlPath));
  if (!filePath.startsWith(root)) filePath = join(root, "index.html");
  if (!existsSync(filePath)) filePath = join(root, "index.html");

  try {
    const data = await readFile(filePath);
    res.setHeader("Content-Type", MIME[extname(filePath)] || "application/octet-stream");
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  const ok = Boolean(process.env.GEMINI_API_KEY);
  console.log(`\n  Resume Tailor Pro → http://localhost:${PORT}`);
  console.log(`  Gemini AI: ${ok ? "configured ✓" : "not configured (set GEMINI_API_KEY in .env)"}\n`);
});
