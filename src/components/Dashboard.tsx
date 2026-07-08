import { useMemo, useState } from "react";
import {
  Sparkles,
  PencilRuler,
  Target,
  ShieldCheck,
  RotateCcw,
  Trash2,
  UploadCloud,
  LayoutTemplate,
  Download,
  Mail,
  Phone,
  MapPin,
  Link2,
} from "lucide-react";
import { useResumeStore } from "../store/useResumeStore";
import { getTemplate } from "../templates/registry";
import { isResumeEmpty } from "../data/masterResume";
import { atsScore, matchJob } from "../lib/ai";
import { ResumeTemplate } from "../templates/ResumeTemplate";
import { ScoreRing } from "./ScoreRing";
import { ImportModal } from "./ImportModal";
import { AutoScaledContainer } from "./AutoScaledContainer";

export function Dashboard() {
  const { working, templateId, design, versions, jobDescription, setView, restoreVersion, deleteVersion } =
    useResumeStore();
  const template = getTemplate(templateId);
  const [importOpen, setImportOpen] = useState(false);

  const ats = useMemo(() => atsScore(working, template, jobDescription), [working, template, jobDescription]);
  const match = useMemo(
    () => (jobDescription.trim() ? matchJob(working, jobDescription) : null),
    [working, jobDescription]
  );

  const c = working.contact;
  const initials = c.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const skillCount = working.skills.reduce((a, g) => a + g.items.length, 0);

  if (isResumeEmpty(working)) {
    return (
      <div className="h-full overflow-auto">
        <EmptyState onImport={() => setImportOpen(true)} onScratch={() => setView("editor")} />
        {importOpen && <ImportModal onClose={() => setImportOpen(false)} />}
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-6xl px-8 py-8 fade-in">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-[var(--muted)]">Your master resume — the single source of truth for every tailored version.</p>
          </div>
          <div className="flex gap-2">
            <button className="btn" onClick={() => setImportOpen(true)}>
              <UploadCloud size={16} /> Import resume
            </button>
            <button className="btn btn-primary" onClick={() => setView("ai")}>
              <Sparkles size={16} /> Tailor to a job
            </button>
          </div>
        </div>

        {/* Identity / overview card */}
        <div className="mt-5 card p-5">
          <div className="flex flex-wrap items-center gap-5">
            <div
              className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${design.accent ?? template.accent}, #0ea5e9)` }}
            >
              {initials || "??"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xl font-bold">{c.name}</div>
              <div className="text-sm text-[var(--muted)]">{c.title}</div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
                {c.email && <span className="flex items-center gap-1"><Mail size={12} /> {c.email}</span>}
                {c.phone && <span className="flex items-center gap-1"><Phone size={12} /> {c.phone}</span>}
                {c.location && <span className="flex items-center gap-1"><MapPin size={12} /> {c.location}</span>}
                {c.links.map((l) => (
                  <span key={l.label} className="flex items-center gap-1"><Link2 size={12} /> {l.label}</span>
                ))}
              </div>
            </div>
            <button className="btn" onClick={() => setView("editor")}>
              <PencilRuler size={15} /> Edit
            </button>
          </div>

          {/* Content counts */}
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            <Count n={working.experience.length} label="Experience" />
            <Count n={working.projects.length} label="Projects" />
            <Count n={skillCount} label="Skills" />
            <Count n={working.education.length} label="Education" />
            <Count n={working.certifications.length} label="Certs" />
            <Count n={versions.length} label="Versions" />
          </div>
        </div>

        {/* Preview + side rail */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          {/* Live preview */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className="h-2 w-2 rounded-full" style={{ background: design.accent ?? template.accent }} />
                {template.name} · Live preview
              </span>
              <button className="text-xs font-medium text-indigo-400 hover:underline" onClick={() => setView("templates")}>
                Change template →
              </button>
            </div>
            <div className="flex justify-center overflow-hidden bg-[#1a1d26] p-5 h-[340px] sm:h-[520px]">
              <AutoScaledContainer maxScale={0.52}>
                <ResumeTemplate data={working} template={template} design={design} />
              </AutoScaledContainer>
            </div>
          </div>

          {/* Side rail */}
          <div className="space-y-6">
            {/* Health */}
            <div className="card p-5">
              <h2 className="mb-3 text-sm font-semibold text-[var(--muted)]">RESUME HEALTH</h2>
              <div className="grid grid-cols-2 gap-3">
                <HealthTile ring={ats.score} color="#22c55e" icon={<ShieldCheck size={15} />} label="ATS" value={`${ats.score}`} onClick={() => setView("ai")} />
                <HealthTile ring={match?.overall ?? 0} color="#6366f1" icon={<Target size={15} />} label="Job match" value={match ? `${match.overall}%` : "—"} onClick={() => setView("ai")} />
              </div>
            </div>

            {/* Quick actions */}
            <div className="card p-4">
              <h2 className="mb-2 text-sm font-semibold text-[var(--muted)]">QUICK ACTIONS</h2>
              <div className="grid grid-cols-2 gap-2">
                <Action icon={<PencilRuler size={15} />} label="Edit" onClick={() => setView("editor")} />
                <Action icon={<LayoutTemplate size={15} />} label="Templates" onClick={() => setView("templates")} />
                <Action icon={<Sparkles size={15} />} label="AI Studio" onClick={() => setView("ai")} />
                <Action icon={<Download size={15} />} label="Export" onClick={() => setView("export")} />
              </div>
            </div>

            {/* Versions */}
            <div className="card p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--muted)]">VERSIONS</h2>
                <button className="text-xs font-medium text-indigo-400 hover:underline" onClick={() => setView("export")}>All →</button>
              </div>
              <div className="space-y-1.5">
                {versions.slice(0, 4).map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{v.label}</div>
                      <div className="truncate text-[11px] text-[var(--muted)]">{new Date(v.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="flex flex-shrink-0 gap-0.5">
                      <button className="btn btn-ghost !p-1.5" title="Restore" onClick={() => restoreVersion(v.id)}><RotateCcw size={14} /></button>
                      {versions.length > 1 && (
                        <button className="btn btn-ghost !p-1.5 text-rose-400" title="Delete" onClick={() => deleteVersion(v.id)}><Trash2 size={14} /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {importOpen && <ImportModal onClose={() => setImportOpen(false)} />}
    </div>
  );
}

function EmptyState({ onImport, onScratch }: { onImport: () => void; onScratch: () => void }) {
  const aiOn = useResumeStore((s) => s.aiEnabled && Boolean(s.aiStatus?.configured));
  const steps = [
    { icon: <UploadCloud size={16} />, title: "Import your resume", desc: "Upload a PDF, DOCX, or paste text" },
    { icon: <Sparkles size={16} />, title: "AI organizes it", desc: "Structured into editable sections" },
    { icon: <Target size={16} />, title: "Tailor to any job", desc: "Match, optimize & export in seconds" },
  ];
  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center px-8 py-12 text-center fade-in">
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-slate-900/60 shadow-xl ring-1 ring-white/10 p-3">
        <img src="/resumebuilderpro.png" alt="Resume Tailor Pro Logo" className="h-full w-full object-contain" />
      </div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Let's build your resume</h1>
      <p className="mt-2 max-w-md text-[var(--muted)]">
        This is a dynamic resume tailor with no preset data. Import your existing resume and it becomes your
        single source of truth — we only ever rewrite and reorganize your real content.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button className="btn btn-primary !px-5 !py-2.5" onClick={onImport}>
          <UploadCloud size={17} /> Import resume
        </button>
        <button className="btn !px-5 !py-2.5" onClick={onScratch}>
          <PencilRuler size={16} /> Start from scratch
        </button>
      </div>

      <div className="mt-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
        {steps.map((s, i) => (
          <div key={i} className="card p-4 text-left">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">{s.icon}</span>
              <span className="text-xs font-semibold text-[var(--muted)]">STEP {i + 1}</span>
            </div>
            <div className="mt-2 font-semibold">{s.title}</div>
            <div className="text-xs text-[var(--muted)]">{s.desc}</div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-[var(--muted)]">
        {aiOn ? "Gemini AI parsing is on — best results from PDF/DOCX/text." : "AI parsing is off; resumes are parsed locally. Enable Gemini in AI Studio for best results."}
      </p>
    </div>
  );
}

function Count({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel-2)] py-2.5 text-center">
      <div className="text-xl font-bold">{n}</div>
      <div className="text-[11px] text-[var(--muted)]">{label}</div>
    </div>
  );
}

function HealthTile({ ring, color, icon, label, value, onClick }: { ring: number; color: string; icon: React.ReactNode; label: string; value: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-3 transition hover:border-indigo-500/40">
      <ScoreRing value={ring} color={color} size={58} />
      <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
        <span style={{ color }}>{icon}</span> {label}
      </div>
      <div className="text-lg font-bold leading-none">{value}</div>
    </button>
  );
}

function Action({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2.5 text-left text-sm font-medium transition-all hover:-translate-y-0.5 hover:border-indigo-500/50"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-sky-500/20 text-indigo-300 transition-colors group-hover:from-indigo-500 group-hover:to-sky-500 group-hover:text-white">
        {icon}
      </span>
      {label}
    </button>
  );
}
