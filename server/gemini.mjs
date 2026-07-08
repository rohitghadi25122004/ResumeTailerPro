// Server-side Gemini proxy. The API key is read from process.env and NEVER
// sent to the browser. The client posts a prompt to /api/gemini and this
// handler injects the key and forwards the request to Google.

const GOOGLE = (model, key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

function json(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(obj));
}

/**
 * Connect-style middleware: handles /api/gemini and /api/gemini/status.
 * Returns true if it handled the request, false otherwise.
 */
export async function handleGemini(req, res) {
  const url = (req.url || "").split("?")[0];
  if (!url.startsWith("/api/gemini")) return false;

  const key = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

  // Status: lets the UI show whether AI is available — never leaks the key.
  if (url === "/api/gemini/status") {
    json(res, 200, { configured: Boolean(key), model });
    return true;
  }

  if (url !== "/api/gemini") {
    json(res, 404, { error: "Not found" });
    return true;
  }
  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed" });
    return true;
  }
  if (!key) {
    json(res, 503, { error: "AI is not configured on the server. Set GEMINI_API_KEY in .env" });
    return true;
  }

  const body = await readBody(req);
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  if (!prompt.trim()) {
    json(res, 400, { error: "Missing prompt" });
    return true;
  }

  try {
    const upstream = await fetch(GOOGLE(model, key), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: typeof body.temperature === "number" ? body.temperature : body.json ? 0.3 : 0.7,
          ...(body.json ? { responseMimeType: "application/json" } : {}),
        },
      }),
    });

    if (!upstream.ok) {
      let detail = "";
      try {
        const j = await upstream.json();
        detail = j?.error?.message ?? "";
      } catch {
        detail = await upstream.text().catch(() => "");
      }
      json(res, upstream.status, { error: detail.slice(0, 300) || upstream.statusText });
      return true;
    }

    const data = await upstream.json();
    const cand = data?.candidates?.[0];
    if (cand?.finishReason === "SAFETY") {
      json(res, 422, { error: "Response blocked by safety filters." });
      return true;
    }
    const text = (cand?.content?.parts || []).map((p) => p.text ?? "").join("").trim();
    if (!text) {
      json(res, 502, { error: "Empty response from Gemini." });
      return true;
    }
    json(res, 200, { text });
  } catch (e) {
    json(res, 502, { error: e instanceof Error ? e.message : "Upstream request failed" });
  }
  return true;
}
