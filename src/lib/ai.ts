import type {
  ResumeData,
  MatchResult,
  KeywordAnalysis,
  AtsResult,
  CoverKind,
  TemplateConfig,
} from "../types";
import { LANGUAGES, FRAMEWORKS, TOOLS, SOFT, INDUSTRY } from "./keywords";

const STOP = new Set([
  "the", "and", "for", "with", "you", "your", "our", "are", "will", "have",
  "this", "that", "from", "not", "but", "all", "who", "can", "job", "role",
  "work", "team", "years", "year", "must", "should", "using", "use", "well",
  "strong", "ability", "experience", "including", "etc", "such", "into", "per",
  "a", "an", "in", "on", "of", "to", "as", "or", "is", "be", "we", "at", "by",
]);

const norm = (s: string) => s.toLowerCase().replace(/[^\w\s.+#/-]/g, " ").replace(/\s+/g, " ").trim();

function resumeText(r: ResumeData): string {
  const parts: string[] = [r.summary, r.contact.title];
  r.skills.forEach((g) => parts.push(g.label, ...g.items));
  r.experience.forEach((e) => parts.push(e.role, e.company, ...e.bullets));
  r.projects.forEach((p) => parts.push(p.name, p.tag, ...p.bullets));
  r.education.forEach((e) => parts.push(e.degree, e.institution, ...e.bullets));
  r.certifications.forEach((c) => parts.push(c.text, c.sub ?? ""));
  r.additional.forEach((c) => parts.push(c.text));
  r.awards.forEach((c) => parts.push(c.text));
  return norm(parts.join(" "));
}

function findTerms(text: string, dict: string[]): string[] {
  const t = ` ${text} `;
  const found = new Set<string>();
  for (const term of dict) {
    const re = new RegExp(`(^|[^\\w])${term.replace(/[.+*?^${}()|[\]\\]/g, "\\$&")}([^\\w]|$)`, "i");
    if (re.test(t)) found.add(term);
  }
  return [...found];
}

const pretty = (t: string) =>
  t
    .split(" ")
    .map((w) =>
      w.length <= 3 || /[.#/+]/.test(w)
        ? w.toUpperCase().replace("REACT.JS", "React.js")
        : w[0].toUpperCase() + w.slice(1)
    )
    .join(" ")
    .replace(/\bApi\b/g, "API")
    .replace(/\bMl\b/g, "ML")
    .replace(/\bAi\b/g, "AI")
    .replace(/\bCi\/cd\b/gi, "CI/CD")
    .replace(/\bSdk\b/g, "SDK")
    .replace(/\bSql\b/g, "SQL");

/** Extract & categorize keywords from arbitrary text (job description). */
export function analyzeKeywords(text: string): KeywordAnalysis {
  const t = norm(text);
  const uniqPretty = (arr: string[]) => [...new Set(arr.map(pretty))];
  return {
    languages: uniqPretty(findTerms(t, LANGUAGES)),
    frameworks: uniqPretty(findTerms(t, FRAMEWORKS)),
    tools: uniqPretty(findTerms(t, TOOLS)),
    soft: uniqPretty(findTerms(t, SOFT)),
    industry: uniqPretty(findTerms(t, INDUSTRY)),
    technical: uniqPretty(topTerms(t, 12)),
  };
}

function topTerms(text: string, n: number): string[] {
  const counts = new Map<string, number>();
  for (const w of text.split(" ")) {
    if (w.length < 4 || STOP.has(w) || /^\d+$/.test(w)) continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map((e) => e[0]);
}

/** Compare a resume against a job description → match score + gaps. */
export function matchJob(resume: ResumeData, jd: string): MatchResult {
  const jdKw = analyzeKeywords(jd);
  const rText = resumeText(resume);
  const allJd = [
    ...jdKw.languages,
    ...jdKw.frameworks,
    ...jdKw.tools,
    ...jdKw.industry,
    ...jdKw.soft,
  ].map((k) => k.toLowerCase());
  const unique = [...new Set(allJd)];

  const strong: string[] = [];
  const missing: string[] = [];
  for (const k of unique) {
    if (rText.includes(k)) strong.push(pretty(k));
    else missing.push(pretty(k));
  }

  const hardMissing = missing.filter((m) =>
    [...jdKw.languages, ...jdKw.frameworks, ...jdKw.tools].includes(m)
  );
  const softMissing = missing.filter((m) => jdKw.soft.includes(m));

  const total = unique.length || 1;
  const raw = strong.length / total;
  // Weighted so a mostly-relevant resume lands in a realistic 55–95 band.
  const overall = Math.round(Math.min(96, Math.max(38, raw * 70 + 30)));

  const weakAreas: string[] = [];
  if (hardMissing.length) weakAreas.push(`Technical coverage — ${hardMissing.slice(0, 6).join(", ")}`);
  if (softMissing.length) weakAreas.push(`Soft-skill signals — ${softMissing.slice(0, 5).join(", ")}`);
  if (resume.summary.length < 120) weakAreas.push("Summary is short — expand with role-specific framing");
  if (!weakAreas.length) weakAreas.push("Well aligned — focus on quantifying impact further");

  const suggestions: string[] = [];
  if (hardMissing.length)
    suggestions.push(
      `Surface any real exposure to ${hardMissing.slice(0, 3).join(", ")} — only add what's truthful.`
    );
  suggestions.push("Run “Tailor Resume” to reorder skills & experience toward this job.");
  suggestions.push("Lead bullets with strong action verbs and keep quantified metrics visible.");
  if (softMissing.length)
    suggestions.push(`Weave in soft skills you genuinely have: ${softMissing.slice(0, 3).join(", ")}.`);

  return {
    overall,
    strongMatches: strong.slice(0, 18),
    missingSkills: missing.slice(0, 18),
    weakAreas,
    suggestions,
  };
}

/**
 * Tailor the resume toward a job description WITHOUT fabricating anything.
 * We only reorder skill groups/items, reorder experience & project bullets,
 * and reorder sections to surface the most JD-relevant content first.
 */
export function tailorResume(resume: ResumeData, jd: string): ResumeData {
  const jdKw = analyzeKeywords(jd);
  const jdTerms = new Set(
    [...jdKw.languages, ...jdKw.frameworks, ...jdKw.tools, ...jdKw.industry, ...jdKw.soft].map((s) =>
      s.toLowerCase()
    )
  );
  const score = (text: string) => {
    const t = text.toLowerCase();
    let s = 0;
    jdTerms.forEach((k) => {
      if (t.includes(k)) s += 2;
    });
    return s;
  };

  const draft: ResumeData = JSON.parse(JSON.stringify(resume));

  // Reorder items inside each skill group by JD relevance.
  draft.skills = draft.skills.map((g) => ({
    ...g,
    items: [...g.items].sort((a, b) => score(b) - score(a)),
  }));

  // Reorder experience bullets by relevance (stable-ish).
  draft.experience = draft.experience.map((e) => ({
    ...e,
    bullets: [...e.bullets].sort((a, b) => score(b) - score(a)),
  }));
  draft.projects = draft.projects.map((p) => ({
    ...p,
    bullets: [...p.bullets].sort((a, b) => score(b) - score(a)),
  }));

  // Move projects above certifications if projects are JD-relevant; put skills
  // right after summary so keywords hit ATS parsers early.
  const order = [...draft.sectionOrder];
  const move = (key: string, toIndex: number) => {
    const i = order.indexOf(key as any);
    if (i === -1) return;
    const [k] = order.splice(i, 1);
    order.splice(Math.min(toIndex, order.length), 0, k);
  };
  move("skills", 1);
  move("experience", 2);
  move("projects", 3);
  draft.sectionOrder = order;

  return draft;
}

/** Lightweight wording improver — tightens filler, fixes casing, strong verbs. */
const FILLER = [
  [/\bworking on\b/gi, "developing"],
  [/\bhelps? (passengers|users|customers)\b/gi, "enables $1"],
  [/\bresponsible for\b/gi, "led"],
  [/\bin order to\b/gi, "to"],
  [/\bvery\b/gi, ""],
  [/\bactually\b/gi, ""],
  [/\bit is an?\b/gi, "a"],
  [/\bprovide functionality such as\b/gi, "delivering"],
  [/\s+,/g, ","],
  [/\s{2,}/g, " "],
];

export function improveWording(text: string): string {
  let out = text;
  for (const [re, rep] of FILLER) out = out.replace(re as RegExp, rep as string);
  out = out.trim();
  if (out) out = out[0].toUpperCase() + out.slice(1);
  return out;
}

export function improveResumeWording(resume: ResumeData): ResumeData {
  const d: ResumeData = JSON.parse(JSON.stringify(resume));
  d.summary = improveWording(d.summary);
  d.experience.forEach((e) => (e.bullets = e.bullets.map(improveWording)));
  d.projects.forEach((p) => (p.bullets = p.bullets.map(improveWording)));
  return d;
}

/** Condense: keep the two strongest bullets per role/project. */
export function condenseResume(resume: ResumeData): ResumeData {
  const d: ResumeData = JSON.parse(JSON.stringify(resume));
  const byLen = (arr: string[], keep: number) =>
    [...arr].sort((a, b) => b.length - a.length).slice(0, keep);
  d.experience.forEach((e) => (e.bullets = byLen(e.bullets, Math.min(2, e.bullets.length))));
  d.projects.forEach((p) => (p.bullets = byLen(p.bullets, Math.min(1, p.bullets.length))));
  if (d.summary.length > 220) d.summary = d.summary.slice(0, 210).replace(/\s\S*$/, "") + ".";
  return d;
}

/** ATS scoring based on structure, keywords, contact completeness & template. */
export function atsScore(resume: ResumeData, template: TemplateConfig, jd?: string): AtsResult {
  const breakdown: AtsResult["breakdown"] = [];
  const warnings: string[] = [];

  // Contact completeness
  const c = resume.contact;
  let contact = 0;
  if (c.email) contact += 6;
  if (c.phone) contact += 5;
  if (c.name) contact += 4;
  if (c.links.length) contact += 5;
  breakdown.push({ label: "Contact & links", score: contact, max: 20, note: "Parseable header details" });
  if (!c.phone || !c.email) warnings.push("Missing a phone or email in the header.");

  // Core sections present
  const need = ["experience", "education", "skills"] as const;
  const present = need.filter((k) => (resume as any)[k]?.length).length;
  const sectionScore = Math.round((present / need.length) * 20);
  breakdown.push({ label: "Core sections", score: sectionScore, max: 20, note: "Experience · Education · Skills" });

  // Keyword density from JD (or generic tech coverage)
  let kwScore: number;
  if (jd && jd.trim()) {
    kwScore = Math.round((matchJob(resume, jd).overall / 100) * 25);
    breakdown.push({ label: "Job keyword match", score: kwScore, max: 25, note: "Alignment with the target JD" });
  } else {
    const kw = analyzeKeywords(resumeText(resume));
    const density = kw.languages.length + kw.frameworks.length + kw.tools.length;
    kwScore = Math.min(25, 8 + density * 2);
    breakdown.push({ label: "Keyword coverage", score: kwScore, max: 25, note: "Add a JD to score against a role" });
  }

  // Quantified impact (numbers in bullets)
  const allBullets = [
    ...resume.experience.flatMap((e) => e.bullets),
    ...resume.projects.flatMap((p) => p.bullets),
  ];
  const quantified = allBullets.filter((b) => /\d/.test(b)).length;
  const qScore = Math.min(15, Math.round((quantified / Math.max(1, allBullets.length)) * 20));
  breakdown.push({ label: "Quantified impact", score: qScore, max: 15, note: `${quantified}/${allBullets.length} bullets contain metrics` });
  if (qScore < 8) warnings.push("Add more numbers/metrics to your bullets (%, time saved, scale).");

  // Format safety (single column & no graphics = safer for ATS)
  const formatScore = template.layout === "sidebar" ? 13 : template.layout === "bold" ? 16 : 20;
  breakdown.push({ label: "Format safety", score: formatScore, max: 20, note: template.layout === "sidebar" ? "Two-column may confuse some parsers" : "Single-column, parser-friendly" });
  if (template.layout === "sidebar")
    warnings.push("Two-column templates can trip strict ATS parsers — Classic or Minimal are safest.");

  const score = breakdown.reduce((a, b) => a + b.score, 0);
  return { score, breakdown, warnings };
}

/** Rewrite the professional summary in a JD-aware way (truthful reframing). */
export function rewriteSummary(resume: ResumeData, jd?: string): string {
  const roles = resume.experience.map((e) => e.role);
  const primaryRole = roles[0] ?? resume.contact.title;
  const langs = resume.skills.find((g) => /language/i.test(g.label))?.items ?? [];
  const topLangs = langs.slice(0, 3).map((l) => l.replace(/\s*\(.*\)/, "")).join(", ");
  const focus = jd ? analyzeKeywords(jd) : null;
  const focusPhrase =
    focus && (focus.industry.length || focus.frameworks.length)
      ? ` with a focus on ${[...focus.industry, ...focus.frameworks].slice(0, 3).join(", ").toLowerCase()}`
      : "";
  return `${primaryRole} skilled in ${topLangs || "modern software development"}${focusPhrase}. Proven experience building and stabilizing production systems, improving performance, and shipping ATS-ready, user-focused features while collaborating across teams.`;
}

/** Generate a cover letter / email / LinkedIn message from resume + JD. */
export function generateCover(kind: CoverKind, resume: ResumeData, jd: string): string {
  const name = resume.contact.name;
  const role = resume.experience[0]?.role ?? resume.contact.title;
  const kw = analyzeKeywords(jd);
  const topSkills = [...kw.languages, ...kw.frameworks, ...kw.tools].slice(0, 4);
  const mine = resumeText(resume);
  const relevant = topSkills.filter((s) => mine.includes(s.toLowerCase()));
  const skillLine = (relevant.length ? relevant : ["Python", "React.js", "Node.js"]).join(", ");
  const target = guessTitle(jd) || "the open role";
  const company = guessCompany(jd) || "your team";
  const proj = resume.projects[0];
  const impact = resume.experience[0]?.bullets[0] ?? "";

  if (kind === "email") {
    return `Subject: Application for ${target} — ${name}

Hi ${company === "your team" ? "there" : company + " team"},

I'm excited to apply for ${target}. As a ${role}, I've built real-time and full-stack systems using ${skillLine}. ${impact ? impact.replace(/\.$/, "") + "." : ""}

I'd welcome the chance to bring this experience to ${company}. My resume is attached — happy to share more at your convenience.

Best regards,
${name}
${resume.contact.phone} · ${resume.contact.email}`;
  }

  if (kind === "linkedin") {
    return `Hi — I noticed ${target} and wanted to reach out. I'm a ${role} with hands-on experience in ${skillLine}${proj ? `, including building ${proj.name}` : ""}. I'd love to connect and learn more about the role and ${company}. Thanks for considering my note!`;
  }

  // full cover letter
  return `${name}
${resume.contact.phone} · ${resume.contact.email} · ${resume.contact.location}

Dear Hiring Manager,

I'm writing to express my strong interest in ${target} at ${company}. As a ${role}, I've focused on building dependable, high-performance software — from ${proj ? proj.name : "production applications"} to full-stack platforms — using ${skillLine}.

In my current role, ${lower(impact)} I take pride in improving stability and performance: I've resolved memory leaks and bottlenecks to cut crashes meaningfully, and optimized API calls to speed up page loads. These are exactly the kinds of outcomes I'd bring to ${company}.

${relevant.length ? `Your posting emphasizes ${relevant.join(", ")}, all of which I've applied hands-on in shipped work.` : "I adapt quickly to new stacks and thrive in collaborative, fast-moving teams."} I'd be glad to discuss how my background maps to your needs.

Thank you for your time and consideration.

Sincerely,
${name}`;
}

const lower = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : "");

function guessTitle(jd: string): string | null {
  const m =
    jd.match(/(?:hiring|seeking|for)\s+(?:an?\s+)?([A-Z][\w ]{2,40}?(?:Engineer|Developer|Analyst|Manager|Designer|Intern))/) ||
    jd.match(/([A-Z][\w ]{2,40}?(?:Engineer|Developer|Analyst|Manager|Designer|Intern))/);
  return m ? m[1].trim() : null;
}

function guessCompany(jd: string): string | null {
  const m = jd.match(/\bat\s+([A-Z][A-Za-z0-9&.\- ]{1,30}?)(?:[,.]|\s+is|\s+we|\n|$)/);
  return m ? m[1].trim() : null;
}

export { resumeText };
