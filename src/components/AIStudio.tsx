import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Wand2,
  ShieldCheck,
  Target,
  Tags,
  Mail,
  Minimize2,
  Maximize2,
  FileSignature,
  Copy,
  Check,
  CircleAlert,
  CircleCheck,
  Loader2,
  Zap,
} from "lucide-react";
import { useResumeStore } from "../store/useResumeStore";
import { getTemplate } from "../templates/registry";
import {
  tailorResume,
  improveResumeWording,
  condenseResume,
  rewriteSummary,
  atsScore,
  matchJob,
  analyzeKeywords,
  generateCover,
} from "../lib/ai";
import {
  geminiTailor,
  geminiImprove,
  geminiRewriteSummary,
  geminiCover,
  getAiStatus,
} from "../lib/gemini";
import type { CoverKind } from "../types";
import { PreviewPane } from "./PreviewPane";
import { ScoreRing } from "./ScoreRing";

type Tab = "actions" | "match" | "keywords" | "ats" | "cover";

const tabs: { key: Tab; label: string; icon: typeof Wand2 }[] = [
  { key: "actions", label: "Actions", icon: Wand2 },
  { key: "match", label: "Match", icon: Target },
  { key: "keywords", label: "Keywords", icon: Tags },
  { key: "ats", label: "ATS", icon: ShieldCheck },
  { key: "cover", label: "Cover", icon: Mail },
];

export function AIStudio() {
  const [tab, setTab] = useState<Tab>("actions");
  const { jobDescription, setJobDescription } = useResumeStore();
  const [toast, setToast] = useState<string | null>(null);
  const [jdOpen, setJdOpen] = useState(true);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2200);
  };

  const jdSet = jobDescription.trim().length > 0;

  return (
    <div className="grid h-full grid-rows-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex h-full min-h-0 flex-col border-r border-[var(--line)]">
        {/* Header: title + compact AI status */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
          <h1 className="flex items-center gap-2 text-lg font-bold">
            <Sparkles size={18} className="text-indigo-400" /> AI Studio
          </h1>
          <AiStatusPill />
        </div>

        {/* JD input — collapsible so it doesn't crowd the actions once filled */}
        <div className="border-b border-[var(--line)] px-4 py-3">
          <button onClick={() => setJdOpen(!jdOpen)} className="flex w-full items-center gap-2 text-left">
            <span className="label">Target job description</span>
            {jdSet && <span className="chip !py-0.5 !px-2 text-[10px] !border-emerald-500/40 !bg-emerald-500/10 text-emerald-300">added</span>}
            <span className="ml-auto text-xs text-[var(--muted)]">{jdOpen ? "Hide" : jdSet ? "Edit" : "Show"}</span>
          </button>
          {jdOpen && (
            <textarea
              className="input mt-2 min-h-[80px] text-sm"
              placeholder="Paste the job description to unlock tailoring, match scoring, keyword gaps & cover letters…"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          )}
        </div>

        {/* Segmented tabs */}
        <div className="no-print border-b border-[var(--line)] px-4 py-2.5">
          <div className="flex gap-1 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-1 py-1.5 text-[12px] sm:px-2 sm:text-[13px] font-medium transition ${
                  tab === t.key ? "bg-[var(--brand)] text-white shadow" : "text-[var(--muted)] hover:text-white"
                }`}
              >
                <t.icon size={14} className="flex-shrink-0" /> <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {tab === "actions" && <ActionsTab flash={flash} />}
          {tab === "match" && <MatchTab />}
          {tab === "keywords" && <KeywordsTab />}
          {tab === "ats" && <AtsTab />}
          {tab === "cover" && <CoverTab />}
        </div>
      </div>

      <div className="hidden min-h-0 lg:block">
        <PreviewPane />
      </div>

      {toast && (
        <div className="no-print fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-xl fade-in">
          <span className="flex items-center gap-2"><Check size={15} /> {toast}</span>
        </div>
      )}
    </div>
  );
}

// ---------- AI status bar ----------
// The API key lives only on the server (.env → /api/gemini). This bar just
// reflects whether the server proxy is configured and lets the user opt out.
function useAiActive() {
  const { aiEnabled, aiStatus } = useResumeStore();
  return aiEnabled && Boolean(aiStatus?.configured);
}

function AiStatusPill() {
  const { aiEnabled, aiStatus, setAiEnabled, setAiStatus } = useResumeStore();

  useEffect(() => {
    getAiStatus().then(setAiStatus);
  }, [setAiStatus]);

  const available = Boolean(aiStatus?.configured);
  const on = available && aiEnabled;

  // Not configured on the server → show a quiet amber hint (no toggle).
  if (aiStatus !== null && !available) {
    return (
      <span
        className="chip !py-1 text-[11px] text-amber-300"
        title="Set GEMINI_API_KEY in .env and restart. Actions use local heuristics meanwhile."
      >
        <CircleAlert size={12} /> Local only
      </span>
    );
  }

  return (
    <button
      onClick={() => available && setAiEnabled(!aiEnabled)}
      disabled={!available}
      title={on ? `Gemini ${aiStatus?.model} — click to use local heuristics` : "Click to enable Gemini"}
      className={`chip !py-1 transition ${on ? "!border-emerald-500/40 !bg-emerald-500/10 text-emerald-300" : "text-[var(--muted)]"}`}
    >
      {aiStatus === null ? (
        <><Loader2 size={12} className="animate-spin" /> checking…</>
      ) : on ? (
        <><Zap size={12} /> Gemini on</>
      ) : (
        <><Zap size={12} /> Local mode</>
      )}
    </button>
  );
}

// ---------- Actions ----------
function ActionsTab({ flash }: { flash: (m: string) => void }) {
  const { working, master, jobDescription, replaceWorking, updateWorking } = useResumeStore();
  const needsJD = !jobDescription.trim();
  const useAI = useAiActive();
  const [busy, setBusy] = useState<string | null>(null);

  const expandFromMaster = () => {
    updateWorking((d) => {
      d.experience.forEach((e) => {
        const m = master.experience.find((x) => x.company === e.company);
        if (m) m.bullets.forEach((b) => { if (!e.bullets.includes(b)) e.bullets.push(b); });
      });
      d.projects.forEach((p) => {
        const m = master.projects.find((x) => x.name === p.name);
        if (m) m.bullets.forEach((b) => { if (!p.bullets.includes(b)) p.bullets.push(b); });
      });
    });
    flash("Restored full detail from your master resume");
  };

  // Wrap an async AI action with busy-state + graceful fallback to heuristics.
  const withAI = async (
    title: string,
    aiFn: () => Promise<void>,
    fallback: () => void,
    fallbackMsg: string
  ) => {
    if (!useAI) {
      fallback();
      flash(fallbackMsg);
      return;
    }
    setBusy(title);
    try {
      await aiFn();
      flash(`${title} · done with Gemini ✨`);
    } catch (e) {
      fallback();
      flash(`Gemini failed (${e instanceof Error ? e.message.slice(0, 40) : "error"}) — used local fallback`);
    } finally {
      setBusy(null);
    }
  };

  type Action = {
    icon: React.ReactNode;
    title: string;
    desc: string;
    group: "Rewrite content" | "Structure & format";
    needsJD?: boolean;
    run: () => void;
  };

  const actions: Action[] = [
    {
      icon: <Wand2 size={15} />, title: "Tailor Resume", desc: "Rewrite & reorder toward the JD", group: "Rewrite content", needsJD: true,
      run: () => withAI("Tailor Resume", async () => replaceWorking(await geminiTailor(working, jobDescription)), () => replaceWorking(tailorResume(working, jobDescription)), "Resume tailored to the job description"),
    },
    {
      icon: <Sparkles size={15} />, title: "Improve Wording", desc: "Tighten filler, stronger verbs", group: "Rewrite content",
      run: () => withAI("Improve Wording", async () => replaceWorking(await geminiImprove(working)), () => replaceWorking(improveResumeWording(working)), "Wording improved across bullets"),
    },
    {
      icon: <FileSignature size={15} />, title: "Rewrite Summary", desc: "Regenerate a truthful, JD-aware summary", group: "Rewrite content",
      run: () => withAI("Rewrite Summary", async () => { const s = await geminiRewriteSummary(working, jobDescription); updateWorking((d) => (d.summary = s)); }, () => updateWorking((d) => (d.summary = rewriteSummary(working, jobDescription))), "Summary rewritten"),
    },
    {
      icon: <ShieldCheck size={15} />, title: "ATS Optimize", desc: "Reorder for parsers, safe layout", group: "Structure & format",
      run: () => withAI("ATS Optimize", async () => { replaceWorking(await geminiTailor(working, jobDescription || "general software engineering role")); useResumeStore.getState().setTemplate("classic"); }, () => { replaceWorking(tailorResume(working, jobDescription || "")); useResumeStore.getState().setTemplate("classic"); }, "Optimized for ATS parsing"),
    },
    {
      icon: <Minimize2 size={15} />, title: "Condense Resume", desc: "Keep the strongest bullets", group: "Structure & format",
      run: () => { replaceWorking(condenseResume(working)); flash("Resume condensed"); },
    },
    {
      icon: <Maximize2 size={15} />, title: "Expand Experience", desc: "Restore full detail from master", group: "Structure & format",
      run: expandFromMaster,
    },
  ];

  const groups: Action["group"][] = ["Rewrite content", "Structure & format"];

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g}>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">{g}</div>
          <div className="space-y-1.5">
            {actions
              .filter((a) => a.group === g)
              .map((a) => {
                const disabled = (a.needsJD && needsJD) || busy !== null;
                return (
                  <button
                    key={a.title}
                    disabled={disabled}
                    onClick={a.run}
                    title={a.needsJD && needsJD ? "Add a job description first" : a.desc}
                    className="group flex w-full items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2.5 text-left transition-all hover:border-indigo-500/50 hover:bg-[var(--panel)] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 text-white">
                      {busy === a.title ? <Loader2 size={15} className="animate-spin" /> : a.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        {a.title}
                        {a.needsJD && needsJD && (
                          <span className="chip !py-0 !px-1.5 text-[10px] text-[var(--muted)]">needs JD</span>
                        )}
                      </div>
                      <div className="truncate text-[11px] text-[var(--muted)]">{a.desc}</div>
                    </div>
                    {busy === a.title && <span className="text-[11px] text-indigo-300">working…</span>}
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Match ----------
function MatchTab() {
  const { working, jobDescription } = useResumeStore();
  const res = useMemo(() => (jobDescription.trim() ? matchJob(working, jobDescription) : null), [working, jobDescription]);
  if (!res) return <Empty msg="Paste a job description to compute your match score." />;

  const color = res.overall >= 75 ? "#22c55e" : res.overall >= 55 ? "#f59e0b" : "#ef4444";
  return (
    <div className="space-y-5">
      <div className="card flex flex-col sm:flex-row items-center text-center sm:text-left gap-4 sm:gap-5 p-5">
        <ScoreRing value={res.overall} color={color} size={92} stroke={8} label="match" />
        <div>
          <div className="text-xs sm:text-sm text-[var(--muted)]">Overall match</div>
          <div className="text-2xl sm:text-3xl font-bold">{res.overall}%</div>
          <div className="text-xs sm:text-sm text-[var(--muted)]">{res.overall >= 75 ? "Strong alignment" : res.overall >= 55 ? "Decent — tailor to lift it" : "Needs tailoring"}</div>
        </div>
      </div>

      <TagBlock title="Strong matches" tone="good" items={res.strongMatches} />
      <TagBlock title="Missing skills" tone="bad" items={res.missingSkills} />

      <div className="card p-4">
        <h3 className="mb-2 text-sm font-semibold text-[var(--muted)]">WEAK AREAS</h3>
        <ul className="space-y-1.5 text-sm">
          {res.weakAreas.map((w, i) => (
            <li key={i} className="flex gap-2"><CircleAlert size={15} className="mt-0.5 flex-shrink-0 text-amber-400" /> {w}</li>
          ))}
        </ul>
      </div>
      <div className="card p-4">
        <h3 className="mb-2 text-sm font-semibold text-[var(--muted)]">SUGGESTIONS</h3>
        <ul className="space-y-1.5 text-sm">
          {res.suggestions.map((s, i) => (
            <li key={i} className="flex gap-2"><Sparkles size={15} className="mt-0.5 flex-shrink-0 text-indigo-400" /> {s}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------- Keywords ----------
function KeywordsTab() {
  const { working, jobDescription } = useResumeStore();
  const kw = useMemo(() => analyzeKeywords(jobDescription || ""), [jobDescription]);
  if (!jobDescription.trim()) return <Empty msg="Paste a job description to extract & categorize keywords." />;

  const groups: { label: string; items: string[] }[] = [
    { label: "Programming Languages", items: kw.languages },
    { label: "Frameworks & Libraries", items: kw.frameworks },
    { label: "Tools & Platforms", items: kw.tools },
    { label: "Industry / Technical Terms", items: kw.industry },
    { label: "Soft Skills", items: kw.soft },
    { label: "Frequent Terms", items: kw.technical },
  ].filter((g) => g.items.length);

  const resumeLower = JSON.stringify(working).toLowerCase();

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted)]">Keywords found in the JD. <span className="text-emerald-400">Green</span> already appear in your resume — <span className="text-rose-400">red</span> are gaps to weave in naturally (only if truthful).</p>
      {groups.map((g) => (
        <div key={g.label} className="card p-4">
          <h3 className="mb-2 text-sm font-semibold text-[var(--muted)]">{g.label.toUpperCase()}</h3>
          <div className="flex flex-wrap gap-2">
            {g.items.map((it) => {
              const has = resumeLower.includes(it.toLowerCase());
              return (
                <span key={it} className={`chip ${has ? "!border-emerald-500/40 !bg-emerald-500/10 text-emerald-300" : "!border-rose-500/40 !bg-rose-500/10 text-rose-300"}`}>
                  {has ? <Check size={12} /> : <CircleAlert size={12} />} {it}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- ATS ----------
function AtsTab() {
  const { working, templateId, jobDescription } = useResumeStore();
  const res = useMemo(() => atsScore(working, getTemplate(templateId), jobDescription), [working, templateId, jobDescription]);
  const color = res.score >= 80 ? "#22c55e" : res.score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="space-y-5">
      <div className="card flex flex-col sm:flex-row items-center text-center sm:text-left gap-4 sm:gap-5 p-5">
        <ScoreRing value={res.score} color={color} size={92} stroke={8} label="/100" />
        <div>
          <div className="text-xs sm:text-sm text-[var(--muted)]">ATS compatibility</div>
          <div className="text-2xl sm:text-3xl font-bold">{res.score}<span className="text-lg text-[var(--muted)]">/100</span></div>
          <div className="text-xs sm:text-sm text-[var(--muted)]">{res.score >= 80 ? "Excellent — parser-friendly" : res.score >= 60 ? "Good — a few tweaks help" : "Needs work"}</div>
        </div>
      </div>

      <div className="card divide-y divide-[var(--line)] p-1">
        {res.breakdown.map((b) => (
          <div key={b.label} className="flex items-center gap-3 p-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>{b.label}</span>
                <span className="tabular-nums text-[var(--muted)]">{b.score}/{b.max}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400" style={{ width: `${(b.score / b.max) * 100}%` }} />
              </div>
              <div className="mt-1 text-[11px] text-[var(--muted)]">{b.note}</div>
            </div>
          </div>
        ))}
      </div>

      {res.warnings.length > 0 ? (
        <div className="card p-4">
          <h3 className="mb-2 text-sm font-semibold text-[var(--muted)]">RECOMMENDATIONS</h3>
          <ul className="space-y-1.5 text-sm">
            {res.warnings.map((w, i) => (
              <li key={i} className="flex gap-2"><CircleAlert size={15} className="mt-0.5 flex-shrink-0 text-amber-400" /> {w}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <CircleCheck size={16} /> No blocking ATS issues detected. Nice work.
        </div>
      )}
    </div>
  );
}

// ---------- Cover Letter ----------
function CoverTab() {
  const { working, jobDescription } = useResumeStore();
  const useAI = useAiActive();
  const [kind, setKind] = useState<CoverKind>("cover");
  const [copied, setCopied] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const generate = async () => {
    if (!jobDescription.trim()) return;
    setErr(null);
    if (!useAI) {
      setText(generateCover(kind, working, jobDescription));
      return;
    }
    setLoading(true);
    try {
      setText(await geminiCover(kind, working, jobDescription));
    } catch (e) {
      setText(generateCover(kind, working, jobDescription));
      setErr(`Gemini failed — showing local draft. (${e instanceof Error ? e.message.slice(0, 60) : "error"})`);
    } finally {
      setLoading(false);
    }
  };

  // Regenerate whenever the kind changes (and on first mount).
  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  if (!jobDescription.trim()) return <Empty msg="Paste a job description to generate a cover letter, email, or LinkedIn note." />;

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const kinds: { k: CoverKind; label: string }[] = [
    { k: "cover", label: "Cover Letter" },
    { k: "email", label: "Short Email" },
    { k: "linkedin", label: "LinkedIn Note" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {kinds.map((x) => (
            <button key={x.k} onClick={() => setKind(x.k)} className={`chip cursor-pointer ${kind === x.k ? "!border-indigo-500 !bg-indigo-500/15 text-white" : ""}`}>
              {x.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <button className="btn btn-ghost flex-1 sm:flex-initial justify-center" onClick={generate} disabled={loading}>
            {loading ? <><Loader2 size={15} className="animate-spin" /> Generating…</> : <><Sparkles size={15} /> Regenerate</>}
          </button>
          <button className="btn btn-primary flex-1 sm:flex-initial justify-center" onClick={copy} disabled={!text}>{copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy</>}</button>
        </div>
      </div>
      {err && <div className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">{err}</div>}
      {loading ? (
        <div className="flex h-[420px] items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--panel-2)] text-[var(--muted)]">
          <Loader2 size={20} className="mr-2 animate-spin" /> Writing with Gemini…
        </div>
      ) : (
        <textarea className="input min-h-[420px] whitespace-pre-wrap font-mono text-[13px] leading-relaxed" value={text} onChange={(e) => setText(e.target.value)} />
      )}
    </div>
  );
}

// ---------- helpers ----------
function TagBlock({ title, tone, items }: { title: string; tone: "good" | "bad"; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="card p-4">
      <h3 className="mb-2 text-sm font-semibold text-[var(--muted)]">{title.toUpperCase()}</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <span key={it} className={`chip ${tone === "good" ? "!border-emerald-500/40 !bg-emerald-500/10 text-emerald-300" : "!border-rose-500/40 !bg-rose-500/10 text-rose-300"}`}>
            {tone === "good" ? <Check size={12} /> : <CircleAlert size={12} />} {it}
          </span>
        ))}
      </div>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 text-center text-[var(--muted)]">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--panel-2)]">
        <Target size={24} className="text-indigo-400" />
      </div>
      <p className="max-w-xs text-sm">{msg}</p>
    </div>
  );
}
