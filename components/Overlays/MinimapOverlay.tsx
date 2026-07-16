// components/Overlays/MinimapOverlay.tsx
import { useRef } from "react";
import { useEditorStore, blocksOf } from "../../store/editorStore";

const MAP_W = 160;

export default function MinimapOverlay() {
  const doc = useEditorStore((s) => s.doc);
  const viewport = useEditorStore((s) => s.viewport);
  const setViewport = useEditorStore((s) => s.setViewport);
  const ref = useRef<SVGSVGElement>(null);
  const blocks = blocksOf(doc);

  const mapH = (doc.heightMm / doc.widthMm) * MAP_W;
  const scale = MAP_W / doc.widthMm;

  const jump = (clientX: number, clientY: number) => {
    const rect = ref.current!.getBoundingClientRect();
    const x = ((clientX - rect.left) / MAP_W) * doc.widthMm;
    const y = ((clientY - rect.top) / mapH) * doc.heightMm;
    setViewport({ centerX: x, centerY: y });
  };

  return (
    <svg
      ref={ref}
      className="absolute top-4 left-4 rounded-md border border-stone-300 bg-white shadow-sm cursor-pointer"
      width={MAP_W}
      height={mapH}
      viewBox={`0 0 ${doc.widthMm} ${doc.heightMm}`}
      onPointerDown={(e) => {
        e.stopPropagation();
        jump(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1) jump(e.clientX, e.clientY);
      }}
    >
      <rect x={0} y={0} width={doc.widthMm} height={doc.heightMm} fill="#faf8f3" />
      {blocks.map((b) => (
        <rect key={b.id} x={b.x} y={b.y} width={b.w} height={b.h} fill="#8a8477" />
      ))}
      {/* current viewport frame */}
      <rect
        x={viewport.centerX - doc.widthMm / (2 * viewport.scale) - 0}
        y={viewport.centerY - doc.heightMm / (2 * viewport.scale) - 0}
        width={doc.widthMm / viewport.scale}
        height={doc.heightMm / viewport.scale}
        fill="none"
        stroke="#2563eb"
        strokeWidth={doc.widthMm * 0.006}
      />
    </svg>
  );
}
