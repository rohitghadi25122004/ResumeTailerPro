import { useState } from "react";
import {
  Undo2,
  Redo2,
  RotateCcw,
  Save,
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  GripVertical,
  Palette,
  Type,
  Sliders,
  UploadCloud,
} from "lucide-react";
import { useResumeStore } from "../store/useResumeStore";
import { makeId } from "../data/masterResume";
import type { SectionKey } from "../types";
import { PreviewPane } from "./PreviewPane";
import { ImportModal } from "./ImportModal";

const ACCENTS = ["#1e293b", "#4f46e5", "#0d9488", "#ea580c", "#7c3aed", "#be123c", "#0284c7", "#166534"];

export function Editor() {
  const { working, updateWorking, undo, redo, resetToMaster, saveVersion } = useResumeStore();
  const [saveOpen, setSaveOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  return (
    <div className="grid h-full grid-rows-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Form column */}
      <div className="flex h-full min-h-0 flex-col border-r border-[var(--line)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--line)] px-4 py-3 gap-2.5">
          <div>
            <h1 className="text-lg font-bold">Resume Editor</h1>
            <p className="hidden sm:block text-xs text-[var(--muted)]">Edit content, styling & section order — live preview updates instantly.</p>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <button className="btn btn-ghost !p-2" title="Undo" onClick={undo}><Undo2 size={16} /></button>
            <button className="btn btn-ghost !p-2" title="Redo" onClick={redo}><Redo2 size={16} /></button>
            <button className="btn btn-ghost !p-2" title="Reset to master" onClick={() => confirm("Reset all edits back to your master resume?") && resetToMaster()}>
              <RotateCcw size={16} />
            </button>
            <button className="btn !p-2 sm:!p-2.5" title="Import a resume" onClick={() => setImportOpen(true)}>
              <UploadCloud size={16} /> <span className="hidden sm:inline">Import</span>
            </button>
            <button className="btn btn-primary !p-2 sm:!p-2.5" onClick={() => setSaveOpen(true)}>
              <Save size={16} /> <span className="hidden sm:inline">Save version</span><span className="sm:hidden">Save</span>
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-auto p-5">
          <DesignControls />

          {/* Contact */}
          <Panel title="Contact & Links" icon={<Type size={15} />} defaultOpen>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Full name" value={working.contact.name} onChange={(v) => updateWorking((d) => (d.contact.name = v))} />
              <Field label="Headline / title" value={working.contact.title} onChange={(v) => updateWorking((d) => (d.contact.title = v))} />
              <Field label="Phone" value={working.contact.phone} onChange={(v) => updateWorking((d) => (d.contact.phone = v))} />
              <Field label="Email" value={working.contact.email} onChange={(v) => updateWorking((d) => (d.contact.email = v))} />
              <Field label="Location" value={working.contact.location} onChange={(v) => updateWorking((d) => (d.contact.location = v))} className="sm:col-span-2" />
            </div>
            <div className="mt-3 space-y-2">
              <span className="label">Links</span>
              {working.contact.links.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <input className="input w-32" value={l.label} onChange={(e) => updateWorking((d) => (d.contact.links[i].label = e.target.value))} />
                  <input className="input flex-1" value={l.url} onChange={(e) => updateWorking((d) => (d.contact.links[i].url = e.target.value))} />
                  <button className="btn btn-ghost !p-2 text-rose-400" onClick={() => updateWorking((d) => d.contact.links.splice(i, 1))}><Trash2 size={15} /></button>
                </div>
              ))}
              <button className="btn btn-ghost text-sm" onClick={() => updateWorking((d) => d.contact.links.push({ label: "Link", url: "https://" }))}>
                <Plus size={14} /> Add link
              </button>
            </div>
          </Panel>

          <SectionOrder />

          {/* Summary */}
          <Panel title={working.sectionTitles.summary} sectionKey="summary">
            <textarea
              className="input min-h-[90px]"
              value={working.summary}
              onChange={(e) => updateWorking((d) => (d.summary = e.target.value))}
            />
          </Panel>

          {/* Skills */}
          <Panel title={working.sectionTitles.skills} sectionKey="skills" count={working.skills.length}>
            {working.skills.map((g, gi) => (
              <div key={g.id} className="mb-3 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-3">
                <div className="flex gap-2">
                  <input className="input flex-1 font-semibold" value={g.label} onChange={(e) => updateWorking((d) => (d.skills[gi].label = e.target.value))} />
                  <button className="btn btn-ghost !p-2 text-rose-400" onClick={() => updateWorking((d) => d.skills.splice(gi, 1))}><Trash2 size={15} /></button>
                </div>
                <input
                  className="input mt-2"
                  value={g.items.join(", ")}
                  placeholder="Comma-separated skills"
                  onChange={(e) => updateWorking((d) => (d.skills[gi].items = e.target.value.split(",").map((s) => s.trim()).filter(Boolean)))}
                />
              </div>
            ))}
            <button className="btn btn-ghost text-sm" onClick={() => updateWorking((d) => d.skills.push({ id: makeId("sk"), label: "New group", items: [] }))}>
              <Plus size={14} /> Add skill group
            </button>
          </Panel>

          {/* Experience */}
          <Panel title={working.sectionTitles.experience} sectionKey="experience" count={working.experience.length}>
            {working.experience.map((e, ei) => (
              <ItemCard key={e.id} onDelete={() => updateWorking((d) => d.experience.splice(ei, 1))}>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Field label="Company" value={e.company} onChange={(v) => updateWorking((d) => (d.experience[ei].company = v))} />
                  <Field label="Location" value={e.location} onChange={(v) => updateWorking((d) => (d.experience[ei].location = v))} />
                  <Field label="Role" value={e.role} onChange={(v) => updateWorking((d) => (d.experience[ei].role = v))} />
                  <Field label="Date" value={e.date} onChange={(v) => updateWorking((d) => (d.experience[ei].date = v))} />
                </div>
                <BulletEditor bullets={e.bullets} onChange={(b) => updateWorking((d) => (d.experience[ei].bullets = b))} />
              </ItemCard>
            ))}
            <button className="btn btn-ghost text-sm" onClick={() => updateWorking((d) => d.experience.push({ id: makeId("exp"), company: "Company", location: "", role: "Role", date: "", bullets: [""] }))}>
              <Plus size={14} /> Add experience
            </button>
          </Panel>

          {/* Projects */}
          <Panel title={working.sectionTitles.projects} sectionKey="projects" count={working.projects.length}>
            {working.projects.map((p, pi) => (
              <ItemCard key={p.id} onDelete={() => updateWorking((d) => d.projects.splice(pi, 1))}>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Field label="Name" value={p.name} onChange={(v) => updateWorking((d) => (d.projects[pi].name = v))} />
                  <Field label="Tag" value={p.tag} onChange={(v) => updateWorking((d) => (d.projects[pi].tag = v))} />
                  <Field label="Date" value={p.date} onChange={(v) => updateWorking((d) => (d.projects[pi].date = v))} />
                </div>
                <BulletEditor bullets={p.bullets} onChange={(b) => updateWorking((d) => (d.projects[pi].bullets = b))} />
              </ItemCard>
            ))}
            <button className="btn btn-ghost text-sm" onClick={() => updateWorking((d) => d.projects.push({ id: makeId("prj"), name: "Project", tag: "", date: "", bullets: [""] }))}>
              <Plus size={14} /> Add project
            </button>
          </Panel>

          {/* Education */}
          <Panel title={working.sectionTitles.education} sectionKey="education" count={working.education.length}>
            {working.education.map((e, ei) => (
              <ItemCard key={e.id} onDelete={() => updateWorking((d) => d.education.splice(ei, 1))}>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Field label="Institution" value={e.institution} onChange={(v) => updateWorking((d) => (d.education[ei].institution = v))} className="sm:col-span-2" />
                  <Field label="Degree" value={e.degree} onChange={(v) => updateWorking((d) => (d.education[ei].degree = v))} />
                  <Field label="Detail (GPA)" value={e.detail} onChange={(v) => updateWorking((d) => (d.education[ei].detail = v))} />
                  <Field label="Location" value={e.location} onChange={(v) => updateWorking((d) => (d.education[ei].location = v))} />
                  <Field label="Date" value={e.date} onChange={(v) => updateWorking((d) => (d.education[ei].date = v))} />
                </div>
                <BulletEditor bullets={e.bullets} onChange={(b) => updateWorking((d) => (d.education[ei].bullets = b))} />
              </ItemCard>
            ))}
          </Panel>

          <SimpleListPanel skey="certifications" hasSub />
          <SimpleListPanel skey="additional" />
          <SimpleListPanel skey="awards" />
        </div>
      </div>

      {/* Preview column */}
      <div className="hidden min-h-0 lg:block">
        <PreviewPane />
      </div>

      {saveOpen && <SaveDialog onClose={() => setSaveOpen(false)} onSave={saveVersion} />}
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} />}
    </div>
  );
}

// ---------- Design controls ----------
function DesignControls() {
  const { design, setDesign } = useResumeStore();
  return (
    <Panel title="Design & Styling" icon={<Palette size={15} />}>
      <div className="space-y-4">
        <div>
          <span className="label">Accent color</span>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a}
                onClick={() => setDesign({ accent: a })}
                className={`h-7 w-7 rounded-full ring-2 transition ${design.accent === a ? "ring-white" : "ring-transparent"}`}
                style={{ background: a }}
              />
            ))}
            <button onClick={() => setDesign({ accent: null })} className={`chip !py-1 ${design.accent === null ? "ring-1 ring-white" : ""}`}>
              Template default
            </button>
            <input type="color" value={design.accent ?? "#4f46e5"} onChange={(e) => setDesign({ accent: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-[var(--line)] bg-transparent" />
          </div>
        </div>

        <Slider label="Font size" value={design.fontScale} min={0.85} max={1.2} step={0.05} suffix="×" onChange={(v) => setDesign({ fontScale: v })} />
        <Slider label="Line height" value={design.lineHeight} min={1.1} max={1.7} step={0.05} onChange={(v) => setDesign({ lineHeight: v })} />
        <Slider label="Section spacing" value={design.sectionGap} min={0.7} max={1.6} step={0.1} suffix="×" onChange={(v) => setDesign({ sectionGap: v })} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <span className="label">Bullet style</span>
            <select className="input mt-2" value={design.bulletStyle} onChange={(e) => setDesign({ bulletStyle: e.target.value as any })}>
              <option value="dot">• Dot</option>
              <option value="dash">– Dash</option>
              <option value="arrow">› Arrow</option>
              <option value="square">▪ Square</option>
            </select>
          </div>
          <div>
            <span className="label">Headings</span>
            <select className="input mt-2" value={design.headingCase} onChange={(e) => setDesign({ headingCase: e.target.value as any })}>
              <option value="template">Template default</option>
              <option value="upper">UPPERCASE</option>
              <option value="normal">Normal case</option>
            </select>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function Slider({ label, value, min, max, step, suffix, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix?: string; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        <span className="text-xs tabular-nums text-[var(--muted)]">{value.toFixed(2)}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="mt-1.5 w-full accent-indigo-500" />
    </div>
  );
}

// ---------- Section order ----------
function SectionOrder() {
  const { working, reorderSection } = useResumeStore();
  return (
    <Panel title="Section Order" icon={<Sliders size={15} />}>
      <div className="space-y-1.5">
        {working.sectionOrder.map((k, i) => (
          <div key={k} className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2">
            <GripVertical size={14} className="text-[var(--muted)]" />
            <span className="flex-1 text-sm font-medium">{working.sectionTitles[k]}</span>
            <button className="btn btn-ghost !p-1.5" disabled={i === 0} onClick={() => reorderSection(i, i - 1)}><ChevronUp size={14} /></button>
            <button className="btn btn-ghost !p-1.5" disabled={i === working.sectionOrder.length - 1} onClick={() => reorderSection(i, i + 1)}><ChevronDown size={14} /></button>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ---------- Simple list section (certs, awards, additional) ----------
function SimpleListPanel({ skey, hasSub }: { skey: Extract<SectionKey, "certifications" | "additional" | "awards">; hasSub?: boolean }) {
  const { working, updateWorking } = useResumeStore();
  const list = working[skey];
  return (
    <Panel title={working.sectionTitles[skey]} sectionKey={skey} count={list.length}>
      {list.map((item, i) => (
        <div key={item.id} className="mb-2 flex gap-2">
          <input className="input flex-1" value={item.text} onChange={(e) => updateWorking((d) => (d[skey][i].text = e.target.value))} />
          {hasSub && <input className="input w-40" placeholder="Issuer" value={item.sub ?? ""} onChange={(e) => updateWorking((d) => (d[skey][i].sub = e.target.value))} />}
          <button className="btn btn-ghost !p-2 text-rose-400" onClick={() => updateWorking((d) => d[skey].splice(i, 1))}><Trash2 size={15} /></button>
        </div>
      ))}
      <button className="btn btn-ghost text-sm" onClick={() => updateWorking((d) => d[skey].push({ id: makeId(skey), text: "" }))}>
        <Plus size={14} /> Add item
      </button>
    </Panel>
  );
}

// ---------- Reusable primitives ----------
function Panel({ title, icon, children, defaultOpen, sectionKey, count }: { title: string; icon?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; sectionKey?: SectionKey; count?: number }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const { working, updateWorking } = useResumeStore();
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-4 py-3 text-left">
        {icon && <span className="text-indigo-400">{icon}</span>}
        {sectionKey ? (
          <input
            className="min-w-0 flex-1 bg-transparent font-semibold outline-none focus:text-indigo-300"
            value={working.sectionTitles[sectionKey]}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => updateWorking((d) => (d.sectionTitles[sectionKey] = e.target.value))}
          />
        ) : (
          <span className="flex-1 font-semibold">{title}</span>
        )}
        {count != null && (
          <span className="chip !py-0.5 !px-2 text-[11px] text-[var(--muted)]">{count}</span>
        )}
        <ChevronDown size={16} className={`text-[var(--muted)] transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="border-t border-[var(--line)] p-4">{children}</div>}
    </div>
  );
}

function Field({ label, value, onChange, className }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="label">{label}</span>
      <input className="input mt-1" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function ItemCard({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  return (
    <div className="mb-3 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-3">
      <div className="flex justify-end">
        <button className="btn btn-ghost !p-1.5 text-rose-400" onClick={onDelete}><Trash2 size={14} /></button>
      </div>
      {children}
    </div>
  );
}

function BulletEditor({ bullets, onChange }: { bullets: string[]; onChange: (b: string[]) => void }) {
  return (
    <div className="mt-2 space-y-1.5">
      <span className="label">Bullets</span>
      {bullets.map((b, i) => (
        <div key={i} className="flex gap-2">
          <textarea
            className="input min-h-[38px] flex-1 text-sm"
            rows={2}
            value={b}
            onChange={(e) => onChange(bullets.map((x, j) => (j === i ? e.target.value : x)))}
          />
          <button className="btn btn-ghost !p-2 text-rose-400" onClick={() => onChange(bullets.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
        </div>
      ))}
      <button className="btn btn-ghost text-xs" onClick={() => onChange([...bullets, ""])}><Plus size={13} /> Add bullet</button>
    </div>
  );
}

function SaveDialog({ onClose, onSave }: { onClose: () => void; onSave: (label: string, note: string) => void }) {
  const versions = useResumeStore((s) => s.versions);
  const [label, setLabel] = useState(`Resume_v${versions.length + 1}`);
  const [note, setNote] = useState("");
  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-md p-5 fade-in" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold">Save a version</h3>
        <p className="text-sm text-[var(--muted)]">Snapshot the current resume so you can roll back anytime.</p>
        <div className="mt-4 space-y-3">
          <Field label="Version label" value={label} onChange={setLabel} />
          <label className="block">
            <span className="label">Note (optional)</span>
            <input className="input mt-1" placeholder="e.g. Tailored for backend role" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { onSave(label, note); onClose(); }}><Save size={15} /> Save version</button>
        </div>
      </div>
    </div>
  );
}
