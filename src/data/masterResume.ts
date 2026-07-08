import type { ResumeData, SectionKey } from "../types";

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;
export const makeId = uid;

/** Canonical section order & titles used for new/imported resumes. */
export const DEFAULT_ORDER: SectionKey[] = [
  "summary",
  "education",
  "skills",
  "experience",
  "projects",
  "certifications",
  "additional",
  "awards",
];

export const DEFAULT_TITLES: Record<SectionKey, string> = {
  summary: "Summary",
  education: "Education",
  skills: "Skills",
  experience: "Experience",
  projects: "Projects",
  certifications: "Certifications",
  awards: "Awards",
  additional: "Additional",
};

/**
 * A blank resume. This app is a dynamic tailor with no built-in personal data —
 * the user imports their own resume (or fills it in) which becomes the single
 * source of truth. Never fabricate content on top of what the user provides.
 */
export function createEmptyResume(): ResumeData {
  return {
    contact: { name: "", title: "", phone: "", email: "", location: "", links: [] },
    summary: "",
    education: [],
    skills: [],
    experience: [],
    projects: [],
    certifications: [],
    awards: [],
    additional: [],
    sectionOrder: [...DEFAULT_ORDER],
    sectionTitles: { ...DEFAULT_TITLES },
  };
}

/** The default (empty) master resume. */
export const masterResume: ResumeData = createEmptyResume();

/** True when the resume has no meaningful content yet. */
export function isResumeEmpty(d: ResumeData): boolean {
  return (
    !d.contact.name.trim() &&
    !d.contact.email.trim() &&
    !d.summary.trim() &&
    d.experience.length === 0 &&
    d.projects.length === 0 &&
    d.education.length === 0 &&
    d.skills.length === 0 &&
    d.certifications.length === 0 &&
    d.awards.length === 0 &&
    d.additional.length === 0
  );
}
