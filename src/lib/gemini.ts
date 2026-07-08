import type { ResumeData, CoverKind, MatchResult, ParsedResume } from "../types";

// The browser NEVER sees the API key. It calls the local /api/gemini proxy,
// which injects the server-side key and forwards to Google.

const NEVER_FABRICATE =
  "CRITICAL RULES: You are editing a real person's resume. NEVER invent or add companies, roles, job titles, dates, employers, projects, skills, certifications, metrics, or achievements that are not already present in the provided data. You may ONLY rephrase, tighten, reorder, and emphasize existing content. Keep every factual claim, number, name, and date exactly truthful. Do not add new bullet points that make new claims.";

export interface AiStatus {
  configured: boolean;
  model: string;
}

export async function getAiStatus(): Promise<AiStatus> {
  try {
    const res = await fetch("/api/gemini/status");
    if (!res.ok) return { configured: false, model: "" };
    return (await res.json()) as AiStatus;
  } catch {
    return { configured: false, model: "" };
  }
}

/** Call the server-side Gemini proxy. */
async function callGemini(prompt: string, opts: { json?: boolean; temperature?: number } = {}): Promise<string> {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, json: opts.json ?? false, temperature: opts.temperature }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `AI request failed (${res.status})`);
  const text = (data as { text?: string }).text ?? "";
  if (!text.trim()) throw new Error("AI returned an empty response.");
  return text.trim();
}

function parseJSON<T>(raw: string): T {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = s.search(/[[{]/);
  if (start > 0) s = s.slice(start);
  return JSON.parse(s) as T;
}

interface TailorPayload {
  summary?: string;
  experience?: { id: string; bullets: string[] }[];
  projects?: { id: string; bullets: string[] }[];
  skillGroups?: { id: string; items: string[] }[];
}

function applyPayload(resume: ResumeData, p: TailorPayload): ResumeData {
  const d: ResumeData = JSON.parse(JSON.stringify(resume));
  if (typeof p.summary === "string" && p.summary.trim()) d.summary = p.summary.trim();
  p.experience?.forEach((e) => {
    const target = d.experience.find((x) => x.id === e.id);
    if (target && Array.isArray(e.bullets) && e.bullets.length) target.bullets = e.bullets.filter(Boolean);
  });
  p.projects?.forEach((pr) => {
    const target = d.projects.find((x) => x.id === pr.id);
    if (target && Array.isArray(pr.bullets) && pr.bullets.length) target.bullets = pr.bullets.filter(Boolean);
  });
  p.skillGroups?.forEach((g) => {
    const target = d.skills.find((x) => x.id === g.id);
    if (target && Array.isArray(g.items) && g.items.length) {
      // keep only skills that already existed (never fabricate skills)
      const allowed = new Set(target.items.map((i) => i.toLowerCase()));
      const reordered = g.items.filter((i) => allowed.has(i.toLowerCase()));
      const missing = target.items.filter((i) => !reordered.some((r) => r.toLowerCase() === i.toLowerCase()));
      target.items = [...reordered, ...missing];
    }
  });
  return d;
}

function resumeForPrompt(resume: ResumeData) {
  return {
    summary: resume.summary,
    experience: resume.experience.map((e) => ({ id: e.id, role: e.role, company: e.company, date: e.date, bullets: e.bullets })),
    projects: resume.projects.map((p) => ({ id: p.id, name: p.name, tag: p.tag, date: p.date, bullets: p.bullets })),
    skillGroups: resume.skills.map((s) => ({ id: s.id, label: s.label, items: s.items })),
  };
}

const OUTPUT_SHAPE = `Return ONLY valid JSON of this exact shape:
{"summary": string, "experience": [{"id": string, "bullets": string[]}], "projects": [{"id": string, "bullets": string[]}], "skillGroups": [{"id": string, "items": string[]}]}
- Preserve every "id" exactly. Do not add or remove experience/project entries.
- You may reorder bullets and skill items and reword them, but keep the same number of bullets or fewer.
- skillGroups.items must be a reordering of the SAME skills already present (no new skills).`;

export async function geminiTailor(resume: ResumeData, jd: string): Promise<ResumeData> {
  const prompt = `${NEVER_FABRICATE}

TASK: Tailor this resume to the target job. Reorder and rephrase existing bullets so the most relevant, JD-aligned experience and skills come first and use the job's terminology where it TRUTHFULLY applies. Strengthen action verbs. Keep all metrics and facts identical.

JOB DESCRIPTION:
"""${jd.slice(0, 6000)}"""

CURRENT RESUME (JSON):
${JSON.stringify(resumeForPrompt(resume))}

${OUTPUT_SHAPE}`;
  return applyPayload(resume, parseJSON<TailorPayload>(await callGemini(prompt, { json: true })));
}

export async function geminiImprove(resume: ResumeData): Promise<ResumeData> {
  const prompt = `${NEVER_FABRICATE}

TASK: Improve the wording of every bullet and the summary. Remove filler, fix grammar and typos, use strong action verbs, keep concise. Do NOT change facts, numbers, names, or dates.

CURRENT RESUME (JSON):
${JSON.stringify(resumeForPrompt(resume))}

${OUTPUT_SHAPE}`;
  return applyPayload(resume, parseJSON<TailorPayload>(await callGemini(prompt, { json: true })));
}

export async function geminiRewriteSummary(resume: ResumeData, jd: string): Promise<string> {
  const prompt = `${NEVER_FABRICATE}

TASK: Write a 2-3 sentence professional summary for this person${jd ? ", aligned to the target job" : ""}. Base it ONLY on their real experience and skills below. Return plain text only (no quotes, no JSON).

${jd ? `JOB DESCRIPTION:\n"""${jd.slice(0, 4000)}"""\n` : ""}
EXPERIENCE: ${JSON.stringify(resume.experience.map((e) => ({ role: e.role, company: e.company, bullets: e.bullets })))}
SKILLS: ${JSON.stringify(resume.skills.map((s) => s.items).flat())}`;
  return (await callGemini(prompt)).replace(/^["']|["']$/g, "");
}

export async function geminiCover(kind: CoverKind, resume: ResumeData, jd: string): Promise<string> {
  const kindText =
    kind === "email"
      ? "a short, warm application EMAIL (with a Subject line, max ~120 words)"
      : kind === "linkedin"
      ? "a brief LinkedIn connection/outreach MESSAGE (max ~80 words, friendly)"
      : "a professional COVER LETTER (3-4 short paragraphs)";
  const prompt = `${NEVER_FABRICATE}

TASK: Write ${kindText} for this candidate applying to the job below. Use ONLY facts from their resume. Sound human and specific, not generic. Return plain text only.

CANDIDATE: ${resume.contact.name}, ${resume.contact.title}. Phone ${resume.contact.phone}, ${resume.contact.email}.
EXPERIENCE: ${JSON.stringify(resume.experience.map((e) => ({ role: e.role, company: e.company, bullets: e.bullets })))}
PROJECTS: ${JSON.stringify(resume.projects.map((p) => ({ name: p.name, bullets: p.bullets })))}
SKILLS: ${JSON.stringify(resume.skills.map((s) => s.items).flat())}

JOB DESCRIPTION:
"""${jd.slice(0, 5000)}"""`;
  return callGemini(prompt);
}

export async function geminiParseResume(text: string): Promise<ParsedResume> {
  const prompt = `You are a precise resume parser. Extract the structured data from the resume text below.
Return ONLY valid JSON of this exact shape (omit or leave "" for anything not present — NEVER invent data):
{
  "contact": {"name": string, "title": string, "phone": string, "email": string, "location": string, "links": [{"label": string, "url": string}]},
  "summary": string,
  "education": [{"institution": string, "location": string, "degree": string, "detail": string, "date": string, "bullets": [string]}],
  "skills": [{"label": string, "items": [string]}],
  "experience": [{"company": string, "location": string, "role": string, "date": string, "bullets": [string]}],
  "projects": [{"name": string, "tag": string, "date": string, "bullets": [string]}],
  "certifications": [{"text": string, "sub": string}],
  "awards": [{"text": string}],
  "additional": [{"text": string}]
}
Rules: "title" is the person's headline/role. "detail" on education is GPA/honors. Group skills by category if the resume does; otherwise one group labelled "Skills". Split comma/pipe-separated skills into the items array. Keep bullet wording faithful to the source. Extract links (LinkedIn/GitHub/portfolio) into contact.links with a short label and a full URL.

RESUME TEXT:
"""${text.slice(0, 14000)}"""`;
  return parseJSON<ParsedResume>(await callGemini(prompt, { json: true, temperature: 0.1 }));
}

export async function geminiSuggestions(resume: ResumeData, jd: string): Promise<Partial<MatchResult>> {
  const prompt = `${NEVER_FABRICATE}

TASK: Compare this resume to the job description. Return ONLY JSON:
{"weakAreas": string[], "suggestions": string[]}
- weakAreas: 2-4 honest gaps between the resume and the job.
- suggestions: 3-5 concrete, actionable tips to improve alignment WITHOUT fabricating experience.

RESUME: ${JSON.stringify(resumeForPrompt(resume))}
JOB DESCRIPTION:
"""${jd.slice(0, 5000)}"""`;
  return parseJSON<Partial<MatchResult>>(await callGemini(prompt, { json: true }));
}
