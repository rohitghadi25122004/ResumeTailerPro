import type { ResumeData } from "../types";

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const safeName = (r: ResumeData) =>
  r.contact.name.replace(/\s+/g, "_") || "resume";

export function exportJSON(r: ResumeData) {
  download(`${safeName(r)}_resume.json`, JSON.stringify(r, null, 2), "application/json");
}

/** Print-to-PDF: triggers the browser print dialog on the print-only resume node. */
export function exportPDF() {
  window.print();
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Standalone HTML export — self-contained, styled, printable. */
export function exportHTML(r: ResumeData, accent: string) {
  const sec = (title: string, body: string) =>
    body
      ? `<section><h2 style="color:${accent};border-bottom:1px solid ${accent}33;text-transform:uppercase;letter-spacing:.06em;font-size:12px;margin:18px 0 8px;padding-bottom:4px">${esc(title)}</h2>${body}</section>`
      : "";
  const bullets = (b: string[]) =>
    `<ul style="margin:4px 0 0 18px;padding:0">${b.map((x) => `<li style="margin:2px 0">${esc(x)}</li>`).join("")}</ul>`;

  const t = r.sectionTitles;
  const blocks: Record<string, string> = {
    summary: sec(t.summary, r.summary ? `<p style="margin:0">${esc(r.summary)}</p>` : ""),
    skills: sec(
      t.skills,
      r.skills
        .map((g) => `<p style="margin:2px 0"><strong>${esc(g.label)}:</strong> ${esc(g.items.join(", "))}</p>`)
        .join("")
    ),
    education: sec(
      t.education,
      r.education
        .map(
          (e) =>
            `<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between"><strong>${esc(e.institution)}</strong><span>${esc(e.date)}</span></div><em>${esc(e.degree)}${e.detail ? " | " + esc(e.detail) : ""}</em>${bullets(e.bullets)}</div>`
        )
        .join("")
    ),
    experience: sec(
      t.experience,
      r.experience
        .map(
          (e) =>
            `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between"><strong>${esc(e.company)} | ${esc(e.location)}</strong><span>${esc(e.date)}</span></div><em>${esc(e.role)}</em>${bullets(e.bullets)}</div>`
        )
        .join("")
    ),
    projects: sec(
      t.projects,
      r.projects
        .map(
          (p) =>
            `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between"><strong>${esc(p.name)} | <em>${esc(p.tag)}</em></strong><span>${esc(p.date)}</span></div>${bullets(p.bullets)}</div>`
        )
        .join("")
    ),
    certifications: sec(
      t.certifications,
      r.certifications.length
        ? bullets(r.certifications.map((c) => `${c.text}${c.sub ? " – " + c.sub : ""}`))
        : ""
    ),
    awards: sec(t.awards, r.awards.length ? bullets(r.awards.map((a) => a.text)) : ""),
    additional: sec(t.additional, r.additional.length ? bullets(r.additional.map((a) => a.text)) : ""),
  };

  const body = r.sectionOrder.map((k) => blocks[k] ?? "").join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(r.contact.name)} — Resume</title>
<style>body{font-family:Georgia,'Times New Roman',serif;max-width:800px;margin:32px auto;padding:0 32px;color:#1a1a1a;line-height:1.4;font-size:13.5px}h1{margin:0;text-align:center;font-size:26px}.contact{text-align:center;color:#444;margin:4px 0 8px;font-size:13px}a{color:${accent}}@media print{body{margin:0}}</style></head>
<body><h1>${esc(r.contact.name)}</h1><div class="contact">${esc(r.contact.phone)} | ${esc(r.contact.email)} | ${r.contact.links.map((l) => `<a href="${esc(l.url)}">${esc(l.label)}</a>`).join(" | ")}</div>${body}</body></html>`;

  download(`${safeName(r)}_resume.html`, html, "text/html");
}

/**
 * DOCX export via Word-compatible HTML (.doc). Word opens this natively and it
 * remains fully editable — no server / LibreOffice needed for a local build.
 */
export function exportDOCX(r: ResumeData, accent: string) {
  const bullets = (b: string[]) =>
    b.map((x) => `<p style="margin:0 0 2px 18px">• ${esc(x)}</p>`).join("");
  const head = (title: string) =>
    `<p style="border-bottom:1px solid #999;font-weight:bold;text-transform:uppercase;margin:12px 0 4px;color:${accent}">${esc(title)}</p>`;
  const t = r.sectionTitles;

  const blocks: Record<string, string> = {
    summary: r.summary ? head(t.summary) + `<p>${esc(r.summary)}</p>` : "",
    skills:
      head(t.skills) +
      r.skills.map((g) => `<p style="margin:0"><b>${esc(g.label)}:</b> ${esc(g.items.join(", "))}</p>`).join(""),
    education:
      head(t.education) +
      r.education
        .map(
          (e) =>
            `<p style="margin:0"><b>${esc(e.institution)}</b> — ${esc(e.date)}</p><p style="margin:0"><i>${esc(e.degree)} ${esc(e.detail)}</i></p>${bullets(e.bullets)}`
        )
        .join(""),
    experience:
      head(t.experience) +
      r.experience
        .map(
          (e) =>
            `<p style="margin:0"><b>${esc(e.company)} | ${esc(e.location)}</b> — ${esc(e.date)}</p><p style="margin:0"><i>${esc(e.role)}</i></p>${bullets(e.bullets)}`
        )
        .join(""),
    projects:
      head(t.projects) +
      r.projects
        .map(
          (p) =>
            `<p style="margin:0"><b>${esc(p.name)}</b> | <i>${esc(p.tag)}</i> — ${esc(p.date)}</p>${bullets(p.bullets)}`
        )
        .join(""),
    certifications: r.certifications.length
      ? head(t.certifications) + bullets(r.certifications.map((c) => `${c.text}${c.sub ? " – " + c.sub : ""}`))
      : "",
    awards: r.awards.length ? head(t.awards) + bullets(r.awards.map((a) => a.text)) : "",
    additional: r.additional.length ? head(t.additional) + bullets(r.additional.map((a) => a.text)) : "",
  };

  const body = r.sectionOrder.map((k) => blocks[k] ?? "").join("");
  const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Resume</title></head>
<body style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#1a1a1a">
<p style="text-align:center;font-size:20pt;font-weight:bold;margin:0">${esc(r.contact.name)}</p>
<p style="text-align:center;margin:0 0 8px">${esc(r.contact.phone)} | ${esc(r.contact.email)} | ${r.contact.links.map((l) => esc(l.label)).join(" | ")}</p>
${body}</body></html>`;

  download(`${safeName(r)}_resume.doc`, doc, "application/msword");
}
