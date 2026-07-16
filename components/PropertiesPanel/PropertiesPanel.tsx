// components/PropertiesPanel/PropertiesPanel.tsx
"use client";

import { useEditorStore } from "../../store/editorStore";
import BlockProperties from "./BlockProperties";
import WireProperties from "./WireProperties";

// Comments are edited inline on the canvas (spec 5C), so they never open this panel.
export default function PropertiesPanel() {
  const inspectorTargetId = useEditorStore((s) => s.inspectorTargetId);
  const doc = useEditorStore((s) => s.doc);
  const setInspectorTarget = useEditorStore((s) => s.setInspectorTarget);

  const target = doc.elements.find((e) => e.id === inspectorTargetId);
  if (!target || target.kind === "comment") return null;

  return (
    <aside className="w-80 shrink-0 h-full border-l border-stone-300 bg-white overflow-y-auto">
      <div className="h-9 flex items-center justify-between px-3 border-b border-stone-200">
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          {target.kind === "block" ? "Thuộc tính khối" : "Thuộc tính dây"}
        </span>
        <button className="text-stone-400 hover:text-stone-700 text-sm" onClick={() => setInspectorTarget(null)}>
          ✕
        </button>
      </div>
      {target.kind === "block" ? <BlockProperties block={target} /> : <WireProperties wire={target} />}
    </aside>
  );
}
