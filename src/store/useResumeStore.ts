import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ResumeData,
  ResumeVersion,
  DesignOverrides,
  SectionKey,
} from "../types";
import { masterResume, makeId } from "../data/masterResume";
import type { AiStatus } from "../lib/gemini";

export type View = "dashboard" | "editor" | "templates" | "ai" | "export";

const defaultDesign: DesignOverrides = {
  accent: null,
  fontScale: 1,
  lineHeight: 1.35,
  sectionGap: 1,
  bulletStyle: "dot",
  headingCase: "template",
};

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

interface AppState {
  view: View;
  master: ResumeData; // immutable source of truth
  working: ResumeData; // the resume currently being edited
  templateId: string;
  design: DesignOverrides;
  versions: ResumeVersion[];
  jobDescription: string;
  zoom: number;
  aiEnabled: boolean; // user preference: use server AI when available
  aiStatus: AiStatus | null; // runtime: is the server proxy configured

  setAiEnabled: (v: boolean) => void;
  setAiStatus: (s: AiStatus) => void;
  setView: (v: View) => void;
  setTemplate: (id: string) => void;
  setDesign: (patch: Partial<DesignOverrides>) => void;
  setZoom: (z: number) => void;
  setJobDescription: (jd: string) => void;

  updateWorking: (updater: (draft: ResumeData) => void) => void;
  replaceWorking: (data: ResumeData) => void;
  resetToMaster: () => void;
  importResume: (data: ResumeData, note: string) => void;
  reorderSection: (from: number, to: number) => void;

  saveVersion: (label: string, note: string) => void;
  restoreVersion: (id: string) => void;
  deleteVersion: (id: string) => void;

  // undo / redo
  _past: ResumeData[];
  _future: ResumeData[];
  undo: () => void;
  redo: () => void;
}

export const useResumeStore = create<AppState>()(
  persist(
    (set, get) => ({
      view: "dashboard",
      master: masterResume,
      working: clone(masterResume),
      templateId: "classic",
      design: defaultDesign,
      versions: [],
      jobDescription: "",
      zoom: 1,
      aiEnabled: true,
      aiStatus: null,
      _past: [],
      _future: [],

      setAiEnabled: (v) => set({ aiEnabled: v }),
      setAiStatus: (s) => set({ aiStatus: s }),
      setView: (v) => set({ view: v }),
      setTemplate: (id) => set({ templateId: id }),
      setDesign: (patch) => set((s) => ({ design: { ...s.design, ...patch } })),
      setZoom: (z) => set({ zoom: Math.min(1.6, Math.max(0.5, z)) }),
      setJobDescription: (jd) => set({ jobDescription: jd }),

      updateWorking: (updater) =>
        set((s) => {
          const draft = clone(s.working);
          updater(draft);
          return { working: draft, _past: [...s._past, s.working].slice(-50), _future: [] };
        }),

      replaceWorking: (data) =>
        set((s) => ({
          working: clone(data),
          _past: [...s._past, s.working].slice(-50),
          _future: [],
        })),

      resetToMaster: () =>
        set((s) => ({
          working: clone(s.master),
          _past: [...s._past, s.working].slice(-50),
          _future: [],
        })),

      importResume: (data, note) =>
        set((s) => ({
          master: clone(data),
          working: clone(data),
          _past: [],
          _future: [],
          versions: [
            {
              id: makeId("ver"),
              label: `Resume_v${s.versions.length + 1}`,
              createdAt: Date.now(),
              note,
              templateId: s.templateId,
              data: clone(data),
            },
            ...s.versions,
          ],
        })),

      reorderSection: (from, to) =>
        set((s) => {
          const order: SectionKey[] = [...s.working.sectionOrder];
          const [moved] = order.splice(from, 1);
          order.splice(to, 0, moved);
          const draft = clone(s.working);
          draft.sectionOrder = order;
          return { working: draft, _past: [...s._past, s.working].slice(-50), _future: [] };
        }),

      saveVersion: (label, note) =>
        set((s) => ({
          versions: [
            {
              id: makeId("ver"),
              label: label || `Resume_v${s.versions.length + 1}`,
              createdAt: Date.now(),
              note,
              templateId: s.templateId,
              data: clone(s.working),
            },
            ...s.versions,
          ],
        })),

      restoreVersion: (id) =>
        set((s) => {
          const v = s.versions.find((x) => x.id === id);
          if (!v) return {};
          return {
            working: clone(v.data),
            templateId: v.templateId,
            _past: [...s._past, s.working].slice(-50),
            _future: [],
          };
        }),

      deleteVersion: (id) =>
        set((s) => ({ versions: s.versions.filter((v) => v.id !== id) })),

      undo: () =>
        set((s) => {
          if (!s._past.length) return {};
          const prev = s._past[s._past.length - 1];
          return {
            working: prev,
            _past: s._past.slice(0, -1),
            _future: [s.working, ...s._future].slice(0, 50),
          };
        }),

      redo: () =>
        set((s) => {
          if (!s._future.length) return {};
          const next = s._future[0];
          return {
            working: next,
            _future: s._future.slice(1),
            _past: [...s._past, s.working].slice(-50),
          };
        }),
    }),
    {
      name: "resume-tailor-pro-v2",
      partialize: (s) => ({
        master: s.master,
        working: s.working,
        templateId: s.templateId,
        design: s.design,
        versions: s.versions,
        jobDescription: s.jobDescription,
        aiEnabled: s.aiEnabled,
      }),
    }
  )
);
