import type { ParsedResume, ResumeData, SectionKey } from "../types";
import { makeId, DEFAULT_ORDER, DEFAULT_TITLES } from "../data/masterResume";
import { geminiParseResume } from "./gemini";

// ---------- Text extraction ----------

export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") return extractPdf(file);
  if (name.endsWith(".docx")) return extractDocx(file);
  // txt / md / anything else → read as text
  return file.text();
}

async function extractPdf(file: File): Promise<string> {
  // Lazy-loaded so pdf.js stays out of the initial bundle.
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let out = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let lastY: number | undefined;
    for (const item of content.items as { str: string; transform: number[] }[]) {
      const y = item.transform?.[5];
      if (lastY !== undefined && y !== undefined && Math.abs(y - lastY) > 3) out += "\n";
      out += item.str + " ";
      lastY = y;
    }
    out += "\n\n";
  }
  return out.replace(/[ \t]+\n/g, "\n").trim();
}

async function extractDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  // Browser build (ambient-declared as untyped in vite-env.d.ts).
  const mammoth = (await import("mammoth/mammoth.browser.js")).default;
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  return String(value || "").trim();
}

// ---------- Normalization: ParsedResume → ResumeData ----------

const clean = (s?: string) => (s ?? "").trim();
const arr = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : []);

export function normalizeResume(p: ParsedResume): ResumeData {
  return {
    contact: {
      name: clean(p.contact?.name) || "Your Name",
      title: clean(p.contact?.title) || "Professional",
      phone: clean(p.contact?.phone),
      email: clean(p.contact?.email),
      location: clean(p.contact?.location),
      links: arr(p.contact?.links)
        .filter((l) => clean(l?.url) || clean(l?.label))
        .map((l) => ({ label: clean(l.label) || "Link", url: clean(l.url) })),
    },
    summary: clean(p.summary),
    education: arr(p.education).map((e) => ({
      id: makeId("edu"),
      institution: clean(e.institution),
      location: clean(e.location),
      degree: clean(e.degree),
      detail: clean(e.detail),
      date: clean(e.date),
      bullets: arr(e.bullets).map(clean).filter(Boolean),
    })),
    skills: arr(p.skills)
      .map((g) => ({ id: makeId("sk"), label: clean(g.label) || "Skills", items: arr(g.items).map(clean).filter(Boolean) }))
      .filter((g) => g.items.length),
    experience: arr(p.experience).map((e) => ({
      id: makeId("exp"),
      company: clean(e.company),
      location: clean(e.location),
      role: clean(e.role),
      date: clean(e.date),
      bullets: arr(e.bullets).map(clean).filter(Boolean),
    })),
    projects: arr(p.projects).map((pr) => ({
      id: makeId("prj"),
      name: clean(pr.name),
      tag: clean(pr.tag),
      date: clean(pr.date),
      bullets: arr(pr.bullets).map(clean).filter(Boolean),
    })),
    certifications: arr(p.certifications).filter((c) => clean(c.text)).map((c) => ({ id: makeId("cert"), text: clean(c.text), sub: clean(c.sub) || undefined })),
    awards: arr(p.awards).filter((a) => clean(a.text)).map((a) => ({ id: makeId("awd"), text: clean(a.text) })),
    additional: arr(p.additional).filter((a) => clean(a.text)).map((a) => ({ id: makeId("add"), text: clean(a.text) })),
    sectionOrder: DEFAULT_ORDER,
    sectionTitles: DEFAULT_TITLES,
  };
}

// ---------- Heuristic (no-AI) fallback parser ----------

const SECTION_ALIASES: Record<string, SectionKey> = {
  summary: "summary", objective: "summary", profile: "summary", about: "summary",
  education: "education", academics: "education",
  skills: "skills", "technical skills": "skills", expertise: "skills", technologies: "skills",
  experience: "experience", "work experience": "experience", "relevant experience": "experience", employment: "experience", "professional experience": "experience",
  projects: "projects", "personal projects": "projects",
  certifications: "certifications", certificates: "certifications", licenses: "certifications",
  awards: "awards", achievements: "awards", honors: "awards",
  additional: "additional", "additional skills": "additional", interests: "additional",
};

export function heuristicParse(text: string): ParsedResume {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const nonEmpty = lines.filter(Boolean);
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] ?? "";
  const phone = text.match(/(\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() ?? "";
  const name = nonEmpty[0] ?? "Your Name";

  const links: { label: string; url: string }[] = [];
  if (/linkedin/i.test(text)) links.push({ label: "LinkedIn", url: "" });
  if (/github/i.test(text)) links.push({ label: "GitHub", url: "" });

  // Bucket lines under detected section headers.
  const buckets: Partial<Record<SectionKey, string[]>> = {};
  let current: SectionKey | null = null;
  for (const line of lines) {
    const key = SECTION_ALIASES[line.toLowerCase().replace(/[:•\-\s]+$/, "").trim()];
    if (key && line.length < 40) {
      current = key;
      buckets[current] = buckets[current] ?? [];
      continue;
    }
    if (current && line) (buckets[current] = buckets[current] ?? []).push(line);
  }

  return {
    contact: { name, title: nonEmpty[1]?.length < 60 ? nonEmpty[1] : "", phone, email, location: "", links },
    summary: (buckets.summary ?? []).join(" "),
    skills: buckets.skills?.length ? [{ label: "Skills", items: buckets.skills.join(", ").split(/[,•|]/).map((s) => s.trim()).filter(Boolean) }] : [],
    experience: buckets.experience?.length ? [{ company: "", role: "", date: "", location: "", bullets: buckets.experience }] : [],
    projects: buckets.projects?.length ? [{ name: "", tag: "", date: "", bullets: buckets.projects }] : [],
    education: buckets.education?.length ? [{ institution: "", degree: "", detail: "", location: "", date: "", bullets: buckets.education }] : [],
    certifications: (buckets.certifications ?? []).map((t) => ({ text: t })),
    awards: (buckets.awards ?? []).map((t) => ({ text: t })),
    additional: (buckets.additional ?? []).map((t) => ({ text: t })),
  };
}

// ---------- Top-level: text → ResumeData ----------

export async function importFromText(text: string, useAI: boolean): Promise<{ data: ResumeData; usedAI: boolean }> {
  if (useAI) {
    try {
      const parsed = await geminiParseResume(text);
      return { data: normalizeResume(parsed), usedAI: true };
    } catch {
      // fall through to heuristic
    }
  }
  return { data: normalizeResume(heuristicParse(text)), usedAI: false };
}
