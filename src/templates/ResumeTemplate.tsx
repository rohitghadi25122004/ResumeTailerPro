import React from "react";
import type {
  ResumeData,
  TemplateConfig,
  DesignOverrides,
  SectionKey,
} from "../types";

interface Props {
  data: ResumeData;
  template: TemplateConfig;
  design: DesignOverrides;
}

const bulletChar: Record<DesignOverrides["bulletStyle"], string> = {
  dot: "•",
  dash: "–",
  arrow: "›",
  square: "▪",
};

export const ResumeTemplate: React.FC<Props> = ({ data, template, design }) => {
  const accent = design.accent ?? template.accent;
  const fontFamily =
    template.font === "serif"
      ? "'Source Serif 4', Georgia, 'Times New Roman', serif"
      : "'Inter', -apple-system, system-ui, sans-serif";

  const headingCase =
    design.headingCase === "template"
      ? template.uppercaseHeadings
      : design.headingCase === "upper";

  const ctx = {
    data,
    template,
    design,
    accent,
    headingCase,
    marker: bulletChar[design.bulletStyle],
  };

  const base: React.CSSProperties = {
    fontFamily,
    fontSize: `${13.5 * design.fontScale}px`,
    lineHeight: design.lineHeight,
    color: "#1c1c1e",
  };

  return (
    <div className="resume-page-inner" style={base}>
      {template.layout === "classic" && <ClassicLayout {...ctx} />}
      {template.layout === "modern" && <ModernLayout {...ctx} />}
      {template.layout === "minimal" && <MinimalLayout {...ctx} />}
      {template.layout === "bold" && <BoldLayout {...ctx} />}
      {template.layout === "sidebar" && <SidebarLayout {...ctx} />}
    </div>
  );
};

// ---------- shared render context ----------
interface Ctx {
  data: ResumeData;
  template: TemplateConfig;
  design: DesignOverrides;
  accent: string;
  headingCase: boolean;
  marker: string;
}

const gap = (c: Ctx, n = 1) => ({ marginTop: `${14 * c.design.sectionGap * n}px` });

function Bullets({ items, c }: { items: string[]; c: Ctx }) {
  return (
    <ul style={{ margin: "4px 0 0", padding: 0, listStyle: "none" }}>
      {items.map((b, i) => (
        <li key={i} style={{ display: "flex", gap: 7, marginBottom: 3, alignItems: "baseline" }}>
          <span style={{ color: c.accent, flexShrink: 0, fontWeight: 700 }}>{c.marker}</span>
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}

function Row({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
      <div style={{ minWidth: 0 }}>{left}</div>
      {right != null && <div style={{ whiteSpace: "nowrap", flexShrink: 0, fontWeight: 600 }}>{right}</div>}
    </div>
  );
}

// ---------- section body (heading-agnostic, reused everywhere) ----------
function SectionBody({ k, c, dense }: { k: SectionKey; c: Ctx; dense?: boolean }) {
  const d = c.data;
  switch (k) {
    case "summary":
      return d.summary ? <p style={{ margin: 0 }}>{d.summary}</p> : null;
    case "skills":
      return (
        <div style={{ display: "grid", gap: 3 }}>
          {d.skills.map((g) => (
            <div key={g.id}>
              <span style={{ fontWeight: 700 }}>{g.label}: </span>
              <span>{g.items.join(", ")}</span>
            </div>
          ))}
        </div>
      );
    case "education":
      return (
        <div style={{ display: "grid", gap: dense ? 6 : 8 }}>
          {d.education.map((e) => (
            <div key={e.id}>
              <Row left={<strong>{e.institution}</strong>} right={!dense && e.date} />
              <div style={{ fontStyle: "italic", opacity: 0.9 }}>
                {e.degree}
                {e.detail ? ` | ${e.detail}` : ""}
              </div>
              {dense && e.date && <div style={{ fontSize: "0.9em", opacity: 0.7 }}>{e.date}</div>}
              {!dense && e.bullets.length > 0 && <Bullets items={e.bullets} c={c} />}
            </div>
          ))}
        </div>
      );
    case "experience":
      return (
        <div style={{ display: "grid", gap: 11 }}>
          {d.experience.map((e) => (
            <div key={e.id}>
              <Row
                left={
                  <strong>
                    {e.company}
                    {e.location ? ` | ${e.location}` : ""}
                  </strong>
                }
                right={e.date}
              />
              <div style={{ fontStyle: "italic", opacity: 0.9 }}>{e.role}</div>
              <Bullets items={e.bullets} c={c} />
            </div>
          ))}
        </div>
      );
    case "projects":
      return (
        <div style={{ display: "grid", gap: 10 }}>
          {d.projects.map((p) => (
            <div key={p.id}>
              <Row
                left={
                  <span>
                    <strong>{p.name}</strong>
                    {p.tag ? (
                      <span style={{ fontStyle: "italic", opacity: 0.85 }}> | {p.tag}</span>
                    ) : null}
                  </span>
                }
                right={p.date}
              />
              <Bullets items={p.bullets} c={c} />
            </div>
          ))}
        </div>
      );
    case "certifications":
      return d.certifications.length ? (
        <Bullets items={d.certifications.map((x) => (x.sub ? `${x.text} – ${x.sub}` : x.text))} c={c} />
      ) : null;
    case "awards":
      return d.awards.length ? <Bullets items={d.awards.map((x) => x.text)} c={c} /> : null;
    case "additional":
      return d.additional.length ? <Bullets items={d.additional.map((x) => x.text)} c={c} /> : null;
    default:
      return null;
  }
}

function hasContent(k: SectionKey, d: ResumeData): boolean {
  switch (k) {
    case "summary": return !!d.summary;
    case "skills": return d.skills.length > 0;
    case "education": return d.education.length > 0;
    case "experience": return d.experience.length > 0;
    case "projects": return d.projects.length > 0;
    case "certifications": return d.certifications.length > 0;
    case "awards": return d.awards.length > 0;
    case "additional": return d.additional.length > 0;
  }
}

// ---------- Heading variants ----------
function Heading({ c, text, variant }: { c: Ctx; text: string; variant: "rule" | "bar" | "plain" | "block" }) {
  const label = c.headingCase ? text.toUpperCase() : text;
  const common: React.CSSProperties = {
    fontWeight: 700,
    letterSpacing: c.headingCase ? "0.06em" : "0.01em",
    fontSize: "0.92em",
    margin: 0,
  };
  if (variant === "rule")
    return (
      <h2 style={{ ...common, borderBottom: `1.5px solid ${c.accent}`, paddingBottom: 3, marginBottom: 6, color: "#111" }}>
        {label}
      </h2>
    );
  if (variant === "bar")
    return (
      <h2 style={{ ...common, color: c.accent, display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        {label}
        <span style={{ flex: 1, height: 2, background: `${c.accent}33`, borderRadius: 2 }} />
      </h2>
    );
  if (variant === "block")
    return (
      <h2
        style={{
          ...common,
          color: "#fff",
          background: c.accent,
          display: "inline-block",
          padding: "2px 10px",
          borderRadius: 3,
          marginBottom: 6,
        }}
      >
        {label}
      </h2>
    );
  return (
    <h2 style={{ ...common, color: c.accent, marginBottom: 6, fontSize: "1em" }}>
      {label}
    </h2>
  );
}

function orderedSections(c: Ctx) {
  return c.data.sectionOrder.filter((k) => hasContent(k, c.data));
}

// ================= CLASSIC =================
function ClassicLayout(c: Ctx) {
  const align = c.template.headerAlign;
  return (
    <div>
      <header style={{ textAlign: align, marginBottom: 10 }}>
        <h1 style={{ margin: 0, fontSize: "2em", fontWeight: 700, letterSpacing: "0.01em" }}>
          {c.data.contact.name}
        </h1>
        <ContactLine c={c} align={align} />
      </header>
      {orderedSections(c).map((k) => (
        <section key={k} style={gap(c)}>
          <Heading c={c} text={c.data.sectionTitles[k]} variant="rule" />
          <SectionBody k={k} c={c} />
        </section>
      ))}
    </div>
  );
}

// ================= MODERN =================
function ModernLayout(c: Ctx) {
  const align = c.template.headerAlign;
  return (
    <div>
      <header style={{ textAlign: align, marginBottom: 12 }}>
        <h1 style={{ margin: 0, fontSize: "2.1em", fontWeight: 800, color: "#111" }}>
          {c.data.contact.name}
        </h1>
        <div style={{ color: c.accent, fontWeight: 600, fontSize: "1.02em", marginTop: 2 }}>
          {c.data.contact.title}
        </div>
        <ContactLine c={c} align={align} />
      </header>
      {orderedSections(c).map((k) => (
        <section key={k} style={gap(c)}>
          <Heading c={c} text={c.data.sectionTitles[k]} variant="bar" />
          <SectionBody k={k} c={c} />
        </section>
      ))}
    </div>
  );
}

// ================= MINIMAL =================
function MinimalLayout(c: Ctx) {
  const align = c.template.headerAlign;
  return (
    <div>
      <header style={{ textAlign: align, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: "1.9em", fontWeight: 600, letterSpacing: "0.02em" }}>
          {c.data.contact.name}
        </h1>
        <div style={{ color: "#666", marginTop: 2 }}>{c.data.contact.title}</div>
        <ContactLine c={c} align={align} muted />
      </header>
      {orderedSections(c).map((k) => (
        <section key={k} style={{ ...gap(c, 1.15), borderTop: "1px solid #ececef", paddingTop: 10 }}>
          <Heading c={c} text={c.data.sectionTitles[k]} variant="plain" />
          <SectionBody k={k} c={c} />
        </section>
      ))}
    </div>
  );
}

// ================= BOLD =================
function BoldLayout(c: Ctx) {
  return (
    <div>
      <header
        style={{
          background: c.accent,
          color: "#fff",
          margin: "-48px -48px 16px",
          padding: "34px 48px 26px",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "2.6em", fontWeight: 800, lineHeight: 1.05, textTransform: "uppercase", letterSpacing: "0.01em" }}>
          {c.data.contact.name}
        </h1>
        <div style={{ opacity: 0.92, fontWeight: 600, marginTop: 4, fontSize: "1.05em" }}>
          {c.data.contact.title}
        </div>
        <div style={{ marginTop: 8, fontSize: "0.9em", opacity: 0.95, display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
          <span>{c.data.contact.phone}</span>
          <span>{c.data.contact.email}</span>
          <span>{c.data.contact.location}</span>
          {c.data.contact.links.map((l) => {
            const href = safeUrl(l.url);
            return href ? (
              <a
                key={l.label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#fff", textDecoration: "underline" }}
              >
                {l.label}
              </a>
            ) : (
              <span key={l.label} style={{ textDecoration: "underline" }}>{l.label}</span>
            );
          })}
        </div>
      </header>
      {orderedSections(c).map((k) => (
        <section key={k} style={gap(c)}>
          <Heading c={c} text={c.data.sectionTitles[k]} variant="block" />
          <SectionBody k={k} c={c} />
        </section>
      ))}
    </div>
  );
}

// ================= SIDEBAR =================
const SIDEBAR_SECTIONS: SectionKey[] = ["skills", "education", "certifications", "additional", "awards"];
const MAIN_SECTIONS: SectionKey[] = ["summary", "experience", "projects"];

function SidebarLayout(c: Ctx) {
  const side = c.template.sidebar ?? "left";
  const ordered = orderedSections(c);
  const sideKeys = ordered.filter((k) => SIDEBAR_SECTIONS.includes(k));
  const mainKeys = ordered.filter((k) => MAIN_SECTIONS.includes(k));

  const Sidebar = (
    <div
      style={{
        background: c.accent,
        color: "#fff",
        padding: "26px 20px",
        width: 232,
        flexShrink: 0,
      }}
    >
      <h1 style={{ margin: 0, fontSize: "1.55em", fontWeight: 800, lineHeight: 1.1 }}>
        {c.data.contact.name}
      </h1>
      <div style={{ opacity: 0.85, fontWeight: 600, marginTop: 2, fontSize: "0.9em" }}>
        {c.data.contact.title}
      </div>

      <div style={{ marginTop: 18 }}>
        <SideHeading text="Details" />
        <div style={{ display: "grid", gap: 4, fontSize: "0.86em", opacity: 0.95 }}>
          <span>{c.data.contact.phone}</span>
          <span style={{ wordBreak: "break-all" }}>{c.data.contact.email}</span>
          <span>{c.data.contact.location}</span>
          {c.data.contact.links.map((l) => {
            const href = safeUrl(l.url);
            return href ? (
              <a
                key={l.label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#fff", textDecoration: "underline", wordBreak: "break-all" }}
              >
                {l.label}: {l.url.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              <span key={l.label} style={{ wordBreak: "break-all" }}>{l.label}</span>
            );
          })}
        </div>
      </div>

      {sideKeys.map((k) => (
        <div key={k} style={{ marginTop: 18 }}>
          <SideHeading text={c.data.sectionTitles[k]} />
          <div style={{ fontSize: "0.86em" }}>
            <SidebarSectionBody k={k} c={c} />
          </div>
        </div>
      ))}
    </div>
  );

  const Main = (
    <div style={{ padding: "26px 26px", flex: 1, minWidth: 0 }}>
      {mainKeys.map((k) => (
        <section key={k} style={gap(c)}>
          <Heading c={c} text={c.data.sectionTitles[k]} variant="bar" />
          <SectionBody k={k} c={c} />
        </section>
      ))}
    </div>
  );

  return (
    <div style={{ display: "flex", margin: -48, minHeight: "calc(100% + 96px)" }}>
      {side === "left" ? (
        <>
          {Sidebar}
          {Main}
        </>
      ) : (
        <>
          {Main}
          {Sidebar}
        </>
      )}
    </div>
  );
}

function SideHeading({ text }: { text: string }) {
  return (
    <div
      style={{
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        fontSize: "0.72em",
        fontWeight: 700,
        opacity: 0.8,
        borderBottom: "1px solid rgba(255,255,255,0.35)",
        paddingBottom: 4,
        marginBottom: 6,
      }}
    >
      {text}
    </div>
  );
}

function SidebarSectionBody({ k, c }: { k: SectionKey; c: Ctx }) {
  const d = c.data;
  if (k === "skills")
    return (
      <div style={{ display: "grid", gap: 6 }}>
        {d.skills.map((g) => (
          <div key={g.id}>
            <div style={{ fontWeight: 700, opacity: 0.95 }}>{g.label}</div>
            <div style={{ opacity: 0.9 }}>{g.items.join(", ")}</div>
          </div>
        ))}
      </div>
    );
  if (k === "education")
    return (
      <div style={{ display: "grid", gap: 8 }}>
        {d.education.map((e) => (
          <div key={e.id}>
            <div style={{ fontWeight: 700 }}>{e.institution}</div>
            <div style={{ opacity: 0.9 }}>{e.degree}</div>
            {e.detail && <div style={{ opacity: 0.8 }}>{e.detail}</div>}
            <div style={{ opacity: 0.7 }}>{e.date}</div>
          </div>
        ))}
      </div>
    );
  const list =
    k === "certifications"
      ? d.certifications.map((x) => (x.sub ? `${x.text} – ${x.sub}` : x.text))
      : k === "additional"
      ? d.additional.map((x) => x.text)
      : d.awards.map((x) => x.text);
  return (
    <ul style={{ margin: 0, paddingLeft: 14 }}>
      {list.map((x, i) => (
        <li key={i} style={{ marginBottom: 3 }}>{x}</li>
      ))}
    </ul>
  );
}

// ---------- safe url helper ----------
export function safeUrl(url: string | undefined | null): string {
  if (!url || !url.trim()) return "";
  const trimmed = url.trim();
  // Check if it already has a protocol
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  // Check if it's an email address
  if (trimmed.includes("@") && !trimmed.includes("/")) {
    return `mailto:${trimmed}`;
  }
  // Validate that it doesn't resolve to just "https://"
  const cleanUrl = trimmed.replace(/^\/+/, "");
  if (!cleanUrl) return "";
  return `https://${cleanUrl}`;
}

// ---------- shared contact line ----------
function ContactLine({ c, align, muted }: { c: Ctx; align: "center" | "left"; muted?: boolean }) {
  const { phone, email, links } = c.data.contact;
  return (
    <div
      style={{
        marginTop: 4,
        fontSize: "0.92em",
        color: muted ? "#666" : "#333",
        display: "flex",
        gap: "3px 8px",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
      }}
    >
      <span>{phone}</span>
      <Sep />
      <span>{email}</span>
      {links.map((l) => {
        const href = safeUrl(l.url);
        return (
          <React.Fragment key={l.label}>
            <Sep />
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: c.accent, textDecoration: "underline" }}
              >
                {l.label}
              </a>
            ) : (
              <span style={{ textDecoration: "underline" }}>{l.label}</span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

const Sep = () => <span style={{ opacity: 0.4 }}>|</span>;
