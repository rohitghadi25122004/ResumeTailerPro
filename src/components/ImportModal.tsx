import { useEffect, useRef, useState } from "react";
import { UploadCloud, FileText, Loader2, Sparkles, Check, CircleAlert, ArrowLeft, X } from "lucide-react";
import { useResumeStore } from "../store/useResumeStore";
import { extractText, importFromText } from "../lib/parse";
import { getAiStatus } from "../lib/gemini";
import type { ResumeData } from "../types";

type Phase = "input" | "parsing" | "review" | "error";

export function ImportModal({ onClose }: { onClose: () => void }) {
  const { aiEnabled, aiStatus, setAiStatus, setAiEnabled, importResume, setView } = useResumeStore();
  const [phase, setPhase] = useState<Phase>("input");
  const [file, setFile] = useState<File | null>(null);
  const [paste, setPaste] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [parsed, setParsed] = useState<ResumeData | null>(null);
  const [usedAI, setUsedAI] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (aiStatus === null) getAiStatus().then(setAiStatus);
  }, [aiStatus, setAiStatus]);

  const aiAvailable = Boolean(aiStatus?.configured);
  const useAI = aiEnabled && aiAvailable;

  const run = async () => {
    setError("");
    setPhase("parsing");
    try {
      const text = file ? await extractText(file) : paste.trim();
      if (!text || text.length < 30) throw new Error("Couldn't read enough text. Try a different file or paste the resume text.");
      const { data, usedAI: ai } = await importFromText(text, useAI);
      setParsed(data);
      setUsedAI(ai);
      setPhase("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse the resume.");
      setPhase("error");
    }
  };

  const apply = () => {
    if (!parsed) return;
    importResume(parsed, file ? `Imported from ${file.name}` : "Imported from pasted text");
    onClose();
    setView("editor");
  };

  const canParse = Boolean(file) || paste.trim().length > 30;

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-lg p-5 fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold"><UploadCloud size={18} className="text-indigo-400" /> Import a resume</h3>
            <p className="text-sm text-[var(--muted)]">
              Upload a PDF, DOCX or TXT — or paste text. {useAI ? "Gemini structures it into editable sections." : "Parsed locally into editable sections."}
            </p>
          </div>
          <button className="btn btn-ghost !p-2" onClick={onClose}><X size={16} /></button>
        </div>

        {phase === "input" && (
          <div className="mt-4 space-y-3">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) { setFile(f); setPaste(""); } }}
              onClick={() => inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${dragOver ? "border-indigo-500 bg-indigo-500/10" : "border-[var(--line)] hover:border-indigo-500/50"}`}
            >
              {file ? (
                <>
                  <FileText size={26} className="text-indigo-400" />
                  <div className="font-semibold">{file.name}</div>
                  <button className="text-xs text-rose-400 hover:underline" onClick={(e) => { e.stopPropagation(); setFile(null); }}>Remove</button>
                </>
              ) : (
                <>
                  <UploadCloud size={26} className="text-[var(--muted)]" />
                  <div className="font-semibold">Drop a file here or click to browse</div>
                  <div className="text-xs text-[var(--muted)]">PDF · DOCX · TXT</div>
                </>
              )}
              <input ref={inputRef} type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setPaste(""); } }} />
            </div>

            <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
              <span className="h-px flex-1 bg-[var(--line)]" /> or paste text <span className="h-px flex-1 bg-[var(--line)]" />
            </div>
            <textarea
              className="input min-h-[90px] text-sm"
              placeholder="Paste your full resume text here…"
              value={paste}
              onChange={(e) => { setPaste(e.target.value); if (e.target.value) setFile(null); }}
            />

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-3">
              <button
                role="switch"
                aria-checked={useAI}
                disabled={!aiAvailable}
                onClick={() => setAiEnabled(!aiEnabled)}
                title={aiAvailable ? "Toggle AI parsing" : "Set GEMINI_API_KEY on the server to enable AI"}
                className="flex items-center gap-2.5 text-left disabled:opacity-60"
              >
                <span className={`relative h-5 w-9 flex-shrink-0 rounded-full transition ${useAI ? "bg-indigo-500" : "bg-[var(--line)]"}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${useAI ? "left-[18px]" : "left-0.5"}`} />
                </span>
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <Sparkles size={13} className={useAI ? "text-indigo-300" : "text-[var(--muted)]"} /> AI parsing
                  </span>
                  <span className="block text-[11px] text-[var(--muted)]">
                    {!aiAvailable ? "Not configured on server" : useAI ? "Gemini structures your sections" : "Off — parsed locally"}
                  </span>
                </span>
              </button>
              <button className="btn btn-primary justify-center" disabled={!canParse} onClick={run}>Parse resume</button>
            </div>
          </div>
        )}

        {phase === "parsing" && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-[var(--muted)]">
            <Loader2 size={28} className="animate-spin text-indigo-400" />
            <div className="font-semibold text-[var(--text)]">Reading & structuring your resume…</div>
            <div className="text-xs">{useAI ? "Gemini is extracting your sections" : "Parsing locally"}</div>
          </div>
        )}

        {phase === "review" && parsed && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-sm text-emerald-200">
              <Check size={16} /> Parsed {usedAI ? "with Gemini" : "locally"}. Review before applying.
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-4">
              <div className="text-lg font-bold">{parsed.contact.name}</div>
              <div className="text-sm text-[var(--muted)]">{parsed.contact.title}</div>
              <div className="mt-1 truncate text-xs text-[var(--muted)]">
                {[parsed.contact.email, parsed.contact.phone, parsed.contact.location].filter(Boolean).join(" · ")}
              </div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <Stat n={parsed.experience.length} label="Experience" />
                <Stat n={parsed.projects.length} label="Projects" />
                <Stat n={parsed.skills.reduce((a, g) => a + g.items.length, 0)} label="Skills" />
                <Stat n={parsed.education.length} label="Education" />
              </div>
            </div>
            <p className="text-xs text-[var(--muted)]">
              This replaces your current master resume (a version snapshot is saved automatically, so you can roll back).
            </p>
            <div className="flex justify-between gap-3">
              <button className="btn btn-ghost" onClick={() => setPhase("input")}><ArrowLeft size={15} /> Back</button>
              <button className="btn btn-primary" onClick={apply}><Check size={15} /> Use this resume</button>
            </div>
          </div>
        )}

        {phase === "error" && (
          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-200">
              <CircleAlert size={16} className="mt-0.5 flex-shrink-0" /> {error}
            </div>
            <button className="btn btn-ghost" onClick={() => setPhase("input")}><ArrowLeft size={15} /> Try again</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-lg bg-[var(--panel)] py-2">
      <div className="text-xl font-bold">{n}</div>
      <div className="text-[10px] text-[var(--muted)]">{label}</div>
    </div>
  );
}
