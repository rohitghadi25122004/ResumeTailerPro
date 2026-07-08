import { useEffect, useRef, useState } from "react";

interface AutoScaledContainerProps {
  children: React.ReactNode;
  maxScale?: number;
}

export function AutoScaledContainer({ children, maxScale = 1 }: AutoScaledContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScale = () => {
      const width = el.getBoundingClientRect().width;
      // Subtract small padding to prevent edge touching
      const newScale = Math.min(maxScale, Math.max(0.1, (width - 4) / 816));
      setScale(newScale);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, [maxScale]);

  return (
    <div ref={containerRef} className="w-full flex justify-center overflow-hidden">
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top center",
          width: 816,
          height: 1056,
          marginBottom: -1056 * (1 - scale),
          flexShrink: 0,
          transition: "transform 0.15s ease-out, margin-bottom 0.15s ease-out",
        }}
      >
        <div className="resume-page" style={{ boxShadow: "none" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
