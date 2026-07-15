import { FileText, FileType, Braces, Code2, RotateCcw, Trash2, Save, Lightbulb, FileDown } from "lucide-react";
import { useState } from "react";
import { useResumeStore } from "../store/useResumeStore";
import { getTemplate } from "../templates/registry";
import { exportDirectPDF, exportDOCX, exportJSON, exportHTML } from "../lib/export";
import { PreviewPane } from "./PreviewPane";

export function ExportPanel() {
  const { working, templateId, design, versions, restoreVersion, deleteVersion, saveVersion } = useResumeStore();
  const template = getTemplate(templateId);
  const accent = design.accent ?? template.accent;
  const [saved, setSaved] = useState(false);

  const options = [
    { icon: <FileDown size={20} />, title: "Direct PDF Download", desc: "Instantly downloads a clean, print-ready PDF file directly to your device.", cta: "Download PDF", tint: "#10b981", run: () => exportDirectPDF(working) },
    { icon: <FileType size={20} />, title: "Editable DOCX", desc: "Word-compatible document you can keep editing. Opens in Word / Google Docs.", cta: "Export DOCX", tint: "#2563eb", run: () => exportDOCX(working, accent) },
    { icon: <Code2 size={20} />, title: "Standalone HTML", desc: "Self-contained styled web page — great for online portfolios.", cta: "Export HTML", tint: "#f59e0b", run: () => exportHTML(working, accent) },
    { icon: <Braces size={20} />, title: "JSON data", desc: "Structured resume data for backups or importing elsewhere.", cta: "Export JSON", tint: "#6366f1", run: () => exportJSON(working) },
  ];

  return (
    <div className="grid h-full grid-rows-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="h-full min-h-0 overflow-auto border-r border-[var(--line)] p-4 sm:p-6">
        <h1 className="flex items-center gap-2 text-xl font-bold"><FileText size={20} className="text-indigo-400" /> Export & Versions</h1>
        <p className="text-sm text-[var(--muted)]">Download in any format — everything is generated locally from your live resume.</p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {options.map((o) => (
            <div key={o.title} className="card flex flex-col p-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ background: o.tint }}>{o.icon}</span>
              <div className="mt-3 font-semibold">{o.title}</div>
              <p className="mt-0.5 flex-1 text-xs text-[var(--muted)]">{o.desc}</p>
              <button className="btn btn-primary mt-3 justify-center" onClick={o.run}>{o.cta}</button>
            </div>
          ))}
        </div>

        {/* Versions */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--muted)]">SAVED VERSIONS</h2>
          <button className="btn btn-ghost text-sm w-full sm:w-auto justify-center" onClick={() => { saveVersion(`Resume_v${versions.length + 1}`, "Manual snapshot"); setSaved(true); setTimeout(() => setSaved(false), 1500); }}>
            <Save size={14} /> {saved ? "Saved!" : "Save current"}
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {versions.map((v) => (
            <div key={v.id} className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-4 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{v.label}</span>
                  <span className="chip !py-0.5 !px-2 text-[11px]">{getTemplate(v.templateId).name}</span>
                </div>
                <div className="truncate text-xs text-[var(--muted)]">{v.note} · {new Date(v.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex flex-shrink-0 gap-1">
                <button className="btn btn-ghost !p-2" title="Restore" onClick={() => restoreVersion(v.id)}><RotateCcw size={15} /></button>
                {versions.length > 1 && <button className="btn btn-ghost !p-2 text-rose-400" title="Delete" onClick={() => deleteVersion(v.id)}><Trash2 size={15} /></button>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="hidden min-h-0 lg:block">
        <PreviewPane />
      </div>
    </div>
  );
}
