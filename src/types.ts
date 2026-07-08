// ---- Core resume data model (single source of truth) ----

export interface ContactInfo {
  name: string;
  title: string;
  phone: string;
  email: string;
  location: string;
  links: { label: string; url: string }[];
}

export interface EducationItem {
  id: string;
  institution: string;
  location: string;
  degree: string;
  detail: string; // e.g. CGPA / honors
  date: string;
  bullets: string[];
}

export interface ExperienceItem {
  id: string;
  company: string;
  location: string;
  role: string;
  date: string;
  bullets: string[];
}

export interface ProjectItem {
  id: string;
  name: string;
  tag: string; // e.g. "Personal Project"
  date: string;
  bullets: string[];
}

export interface SkillGroup {
  id: string;
  label: string; // e.g. "Languages"
  items: string[];
}

export interface SimpleItem {
  id: string;
  text: string;
  sub?: string; // e.g. issuer
}

export type SectionKey =
  | "summary"
  | "education"
  | "skills"
  | "experience"
  | "projects"
  | "certifications"
  | "awards"
  | "additional";

export interface ResumeData {
  contact: ContactInfo;
  summary: string;
  education: EducationItem[];
  skills: SkillGroup[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
  certifications: SimpleItem[];
  awards: SimpleItem[];
  additional: SimpleItem[];
  sectionOrder: SectionKey[];
  sectionTitles: Record<SectionKey, string>;
}

// ---- Templates ----

export type LayoutFamily = "classic" | "modern" | "sidebar" | "minimal" | "bold";

export interface TemplateConfig {
  id: string; // e.g. "classic"
  name: string;
  description: string;
  layout: LayoutFamily;
  font: "serif" | "sans";
  accent: string; // hex — a starting point; adjustable in the editor
  sidebar?: "left" | "right";
  headerAlign: "center" | "left";
  uppercaseHeadings: boolean;
}

// ---- Design overrides applied by the manual editor ----

export interface DesignOverrides {
  accent: string | null;
  fontScale: number; // 0.85 - 1.2
  lineHeight: number; // 1.1 - 1.7
  sectionGap: number; // spacing multiplier
  bulletStyle: "dot" | "dash" | "arrow" | "square";
  headingCase: "template" | "upper" | "normal";
}

// ---- Versions ----

export interface ResumeVersion {
  id: string;
  label: string;
  createdAt: number;
  note: string;
  templateId: string;
  data: ResumeData;
}

// ---- AI analysis result shapes ----

export interface MatchResult {
  overall: number;
  strongMatches: string[];
  missingSkills: string[];
  weakAreas: string[];
  suggestions: string[];
}

export interface KeywordAnalysis {
  languages: string[];
  frameworks: string[];
  tools: string[];
  technical: string[];
  soft: string[];
  industry: string[];
}

export interface AtsResult {
  score: number;
  breakdown: { label: string; score: number; max: number; note: string }[];
  warnings: string[];
}

export type CoverKind = "cover" | "email" | "linkedin";

// ---- Parsed resume (loose shape returned by import/parse before normalizing) ----

export interface ParsedResume {
  contact?: {
    name?: string;
    title?: string;
    phone?: string;
    email?: string;
    location?: string;
    links?: { label: string; url: string }[];
  };
  summary?: string;
  education?: { institution?: string; location?: string; degree?: string; detail?: string; date?: string; bullets?: string[] }[];
  skills?: { label?: string; items?: string[] }[];
  experience?: { company?: string; location?: string; role?: string; date?: string; bullets?: string[] }[];
  projects?: { name?: string; tag?: string; date?: string; bullets?: string[] }[];
  certifications?: { text?: string; sub?: string }[];
  awards?: { text?: string }[];
  additional?: { text?: string }[];
}
