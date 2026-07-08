import { useState } from "react";
import { Check, Eye } from "lucide-react";
import { useResumeStore } from "../store/useResumeStore";
import { templates } from "../templates/registry";
import { ResumeTemplate } from "../templates/ResumeTemplate";
import type { TemplateConfig } from "../types";
import { AutoScaledContainer } from "./AutoScaledContainer";

// Thumbnail frame = a full US-Letter page (816×1056) scaled to fit a 232px card.
const THUMB_W = 232;
const THUMB_SCALE = THUMB_W / 816;
const THUMB_H = Math.round(1056 * THUMB_SCALE);

export function TemplateBrowser() {
  const { working, design, templateId, setTemplate } = useResumeStore();
  const [preview, setPreview] = useState<TemplateConfig | null>(null);

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-6xl px-8 py-8 fade-in">
        <h1 className="text-2xl font-bold">Templates</h1>
        <p className="text-[var(--muted)]">
          Five distinct layouts. Colors, fonts, and spacing are all adjustable in the editor.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              t={t}
              active={t.id === templateId}
              onApply={() => setTemplate(t.id)}
              onPreview={() => setPreview(t)}
              thumb={
                <div style={{ transform: `scale(${THUMB_SCALE})`, transformOrigin: "top left" }}>
                  <div className="resume-page" style={{ boxShadow: "none" }}>
                    <ResumeTemplate data={working} template={t} design={design} />
                  </div>
                </div>
              }
            />
          ))}
        </div>
      </div>

      {preview && (
        <PreviewModal
          t={preview}
          applied={preview.id === templateId}
          onClose={() => setPreview(null)}
          onApply={() => {
            setTemplate(preview.id);
            setPreview(null);
          }}
        />
      )}
    </div>
  );
}

function TemplateCard({
  t,
  active,
  onApply,
  onPreview,
  thumb,
}: {
  t: TemplateConfig;
  active: boolean;
  onApply: () => void;
  onPreview: () => void;
  thumb: React.ReactNode;
}) {
  return (
    <div className={`card group overflow-hidden transition-all hover:-translate-y-1 ${active ? "ring-2 ring-indigo-500" : ""}`}>
      {/* Thumbnail on a soft "desk" canvas so the page floats */}
      <div className="relative flex justify-center bg-[#eef1f7] px-5 pt-6">
        <div
          className="relative overflow-hidden rounded-t-md bg-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.35)] ring-1 ring-black/5"
          style={{ width: THUMB_W, height: THUMB_H }}
        >
          <div className="absolute left-0 top-0">{thumb}</div>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/45 opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100">
          <button className="btn btn-ghost !bg-white/15 text-white" onClick={onPreview}>
            <Eye size={15} /> Preview
          </button>
          <button className="btn btn-primary" onClick={onApply}>
            {active ? <><Check size={15} /> Applied</> : "Use template"}
          </button>
        </div>

        {active && (
          <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg">
            <Check size={16} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] p-3.5">
        <div className="min-w-0">
          <div className="font-semibold">{t.name}</div>
          <p className="truncate text-xs text-[var(--muted)]">{t.description}</p>
        </div>
        <span className="h-4 w-4 flex-shrink-0 rounded-full ring-1 ring-white/15" style={{ background: t.accent }} />
      </div>
    </div>
  );
}

function PreviewModal({
  t,
  applied,
  onClose,
  onApply,
}: {
  t: TemplateConfig;
  applied: boolean;
  onClose: () => void;
  onApply: () => void;
}) {
  const { working, design } = useResumeStore();
  return (
    <div className="no-print fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-sm fade-in" onClick={onClose}>
      <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--panel)] px-6 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0">
          <span className="font-bold">{t.name}</span>
          <span className="ml-2 text-sm text-[var(--muted)]">{t.description}</span>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={onApply} disabled={applied}>
            {applied ? <><Check size={15} /> Applied</> : <><Check size={15} /> Use this template</>}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 sm:p-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto max-w-4xl">
          <AutoScaledContainer maxScale={1.1}>
            <ResumeTemplate data={working} template={t} design={design} />
          </AutoScaledContainer>
        </div>
      </div>
    </div>
  );
}
