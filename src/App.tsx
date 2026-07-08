import { useState } from "react";
import {
  LayoutDashboard,
  PencilRuler,
  LayoutTemplate,
  Sparkles,
  Download,
  Eye,
} from "lucide-react";
import { useResumeStore, type View } from "./store/useResumeStore";
import { PrintRoot, PreviewPane } from "./components/PreviewPane";
import { Dashboard } from "./components/Dashboard";
import { Editor } from "./components/Editor";
import { TemplateBrowser } from "./components/TemplateBrowser";
import { AIStudio } from "./components/AIStudio";
import { ExportPanel } from "./components/ExportPanel";

const nav: { key: View; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "editor", label: "Editor", icon: PencilRuler },
  { key: "templates", label: "Templates", icon: LayoutTemplate },
  { key: "ai", label: "AI Studio", icon: Sparkles },
  { key: "export", label: "Export", icon: Download },
];

export default function App() {
  const { view, setView } = useResumeStore();
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  return (
    <div className="relative flex flex-col-reverse md:flex-row h-full w-full overflow-hidden">
      <div className="aurora" />

      {/* Nav rail / bottom bar */}
      <nav className="no-print relative z-10 flex w-full md:w-[76px] h-16 md:h-full flex-row md:flex-col items-center justify-around md:justify-start gap-1 border-t md:border-t-0 md:border-r border-[var(--line)] bg-[color-mix(in_srgb,var(--panel)_70%,transparent)] px-2 py-1 md:py-4 backdrop-blur-xl flex-shrink-0">
        <div className="hidden md:flex mb-4 h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-slate-900/60 shadow-lg ring-1 ring-white/10 p-1.5">
          <img src="/resumebuilderpro.png" alt="Logo" className="h-full w-full object-contain" />
        </div>
        {nav.map((n) => {
          const active = view === n.key;
          return (
            <button
              key={n.key}
              onClick={() => setView(n.key)}
              className="group relative flex flex-1 md:flex-initial w-full flex-col items-center justify-center gap-0.5 md:gap-1 py-1 md:py-2.5"
            >
              {active && (
                <span className="absolute top-0 left-0 right-0 md:right-auto md:top-1/2 md:-translate-y-1/2 h-[3px] md:h-8 w-full md:w-[3px] rounded-b md:rounded-r bg-gradient-to-r md:bg-gradient-to-b from-indigo-400 to-sky-400" />
              )}
              <span
                className={`flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-xl transition-all ${
                  active
                    ? "bg-[var(--panel-2)] text-white ring-1 ring-[var(--brand)]/40"
                    : "text-[var(--muted)] group-hover:bg-[var(--panel-2)] group-hover:text-white"
                }`}
              >
                <n.icon size={18} />
              </span>
              <span className={`text-[9px] md:text-[10px] font-medium ${active ? "text-white" : "text-[var(--muted)]"}`}>
                {n.label.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Workspace */}
      <main className="relative z-10 min-w-0 flex-1 overflow-hidden">
        {view === "dashboard" && <Dashboard />}
        {view === "editor" && <Editor />}
        {view === "templates" && <TemplateBrowser />}
        {view === "ai" && <AIStudio />}
        {view === "export" && <ExportPanel />}
      </main>

      {/* Floating Mobile Preview Button */}
      {(view === "editor" || view === "ai" || view === "export") && (
        <button
          onClick={() => setMobilePreviewOpen(true)}
          className="fixed bottom-20 right-4 z-40 flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-sky-500 px-4 font-semibold text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/10 active:scale-95 transition lg:hidden"
        >
          <Eye size={18} />
          <span>Preview</span>
        </button>
      )}

      {/* Mobile Preview Modal */}
      {mobilePreviewOpen && (
        <div className="no-print fixed inset-0 z-50 flex flex-col bg-[#0b0d12] lg:hidden">
          <div className="flex h-14 items-center justify-between border-b border-[var(--line)] bg-[var(--panel)] px-4">
            <span className="font-semibold">Live Preview</span>
            <button
              onClick={() => setMobilePreviewOpen(false)}
              className="btn btn-ghost text-sm"
            >
              Close
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <PreviewPane />
          </div>
        </div>
      )}

      <PrintRoot />
    </div>
  );
}

