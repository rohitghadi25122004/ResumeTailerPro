import { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { useResumeStore } from "../store/useResumeStore";
import { getTemplate } from "../templates/registry";
import { ResumeTemplate } from "../templates/ResumeTemplate";

export function PreviewPane() {
  const { working, templateId, design, zoom, setZoom } = useResumeStore();
  const template = getTemplate(templateId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(816);

  // Ctrl / ⌘ + mouse-wheel to zoom (native non-passive listener so we can
  // preventDefault the browser's page zoom). Plain wheel still scrolls.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const step = e.deltaY > 0 ? -0.08 : 0.08;
      setZoom(useResumeStore.getState().zoom + step);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [setZoom]);

  // Track container width for responsive scaling
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateWidth = () => {
      setContainerWidth(el.getBoundingClientRect().width);
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Compute responsive scale to fit the container
  const padding = 32; // 16px on each side
  const fitScale = Math.min(1.2, Math.max(0.1, (containerWidth - padding) / 816));
  const finalScale = fitScale * zoom;

  return (
    <div ref={containerRef} className="flex h-full min-h-0 flex-col w-full">
      <div className="no-print flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5 bg-[var(--panel)]">
        <div className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full" style={{ background: design.accent ?? template.accent }} />
          <span className="font-semibold">{template.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="btn btn-ghost !p-2" onClick={() => setZoom(zoom - 0.1)} title="Zoom out">
            <ZoomOut size={16} />
          </button>
          <button
            className="w-12 text-center text-xs tabular-nums text-[var(--muted)] hover:text-white"
            onClick={() => setZoom(1)}
            title="Reset to fit width"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button className="btn btn-ghost !p-2" onClick={() => setZoom(zoom + 0.1)} title="Zoom in">
            <ZoomIn size={16} />
          </button>
          <button className="btn btn-ghost !p-2" onClick={() => setZoom(1)} title="Reset zoom">
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto" style={{ background: "#1a1d26" }}>
        <div className="flex min-h-full justify-center p-4">
          <div
            style={{
              transform: `scale(${finalScale})`,
              transformOrigin: "top center",
              width: 816,
              height: 1056,
              marginBottom: -1056 * (1 - finalScale),
              flexShrink: 0,
              transition: "transform 0.1s ease-out, margin-bottom 0.1s ease-out",
            }}
          >
            <div className="resume-page" style={{ boxShadow: "0 20px 60px -12px rgba(0, 0, 0, 0.55)" }}>
              <ResumeTemplate data={working} template={template} design={design} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Always-mounted hidden node used for window.print(). */
export function PrintRoot() {
  const { working, templateId, design } = useResumeStore();
  const template = getTemplate(templateId);
  return (
    <div id="print-root">
      <div className="resume-page">
        <ResumeTemplate data={working} template={template} design={design} />
      </div>
    </div>
  );
}

