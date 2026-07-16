// components/Overlays/ZoomControls.tsx
import { useEditorStore } from "../../store/editorStore";

export default function ZoomControls() {
  const viewport = useEditorStore((s) => s.viewport);
  const setViewport = useEditorStore((s) => s.setViewport);
  const fitToView = useEditorStore((s) => s.fitToView);

  const zoom = (factor: number) => setViewport({ scale: Math.min(8, Math.max(0.05, viewport.scale * factor)) });

  return (
    <div className="absolute bottom-4 left-4 flex flex-col items-stretch gap-px rounded-md border border-stone-300 bg-white shadow-sm overflow-hidden text-stone-700">
      <button className="w-9 h-9 grid place-items-center hover:bg-stone-100 text-lg" onClick={() => zoom(1.2)}>
        +
      </button>
      <button
        className="w-9 h-9 grid place-items-center hover:bg-stone-100 text-xs border-y border-stone-200"
        onClick={() => fitToView(window.innerWidth, window.innerHeight)}
        title="Vừa khung hình"
      >
        ⌂
      </button>
      <button className="w-9 h-9 grid place-items-center hover:bg-stone-100 text-lg" onClick={() => zoom(0.8)}>
        −
      </button>
    </div>
  );
}
