import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { geminiApiPlugin } from "./server/vitePlugin.mjs";

export default defineConfig(({ mode }) => {
  // Load .env (incl. non-VITE_ vars) into process.env so the dev proxy can read
  // the key server-side. These are NOT exposed to the client bundle.
  const env = loadEnv(mode, process.cwd(), "");
  process.env.GEMINI_API_KEY = env.GEMINI_API_KEY ?? "";
  process.env.GEMINI_MODEL = env.GEMINI_MODEL ?? "gemini-2.5-flash";

  return {
    plugins: [react(), tailwindcss(), geminiApiPlugin()],
    server: {
      port: 5175,
      open: true,
    },
  };
});
