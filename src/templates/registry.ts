import type { TemplateConfig } from "../types";

/**
 * A small, curated set of genuinely distinct templates — one per layout family.
 * Colors, fonts, spacing and headings are all adjustable in the editor, so we
 * don't ship redundant color variants. Accent values here are sensible defaults.
 */
export const templates: TemplateConfig[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Serif, single-column, ruled headings. The safest choice for ATS.",
    layout: "classic",
    font: "serif",
    accent: "#1e293b",
    headerAlign: "center",
    uppercaseHeadings: true,
  },
  {
    id: "modern",
    name: "Modern",
    description: "Contemporary sans-serif with a clean accent. Balanced and current.",
    layout: "modern",
    font: "sans",
    accent: "#4f46e5",
    headerAlign: "left",
    uppercaseHeadings: true,
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Whitespace-forward with hairline dividers. Understated and refined.",
    layout: "minimal",
    font: "sans",
    accent: "#0f172a",
    headerAlign: "left",
    uppercaseHeadings: false,
  },
  {
    id: "executive",
    name: "Executive",
    description: "Two-column layout with a colored sidebar for contact and skills.",
    layout: "sidebar",
    font: "sans",
    accent: "#1e293b",
    sidebar: "left",
    headerAlign: "left",
    uppercaseHeadings: true,
  },
  {
    id: "bold",
    name: "Bold",
    description: "A statement header band with high impact. For confident profiles.",
    layout: "bold",
    font: "sans",
    accent: "#4338ca",
    headerAlign: "left",
    uppercaseHeadings: true,
  },
];

export const getTemplate = (id: string): TemplateConfig =>
  templates.find((t) => t.id === id) ?? templates[0];
