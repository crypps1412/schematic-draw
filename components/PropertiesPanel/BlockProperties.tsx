// components/PropertiesPanel/BlockProperties.tsx
"use client";

import { useRef } from "react";
import { BlockInstance, Edge } from "../../lib/types";
import { useEditorStore } from "../../store/editorStore";
import { toMm, fromMm } from "../../lib/units";

const EDGES: Edge[] = ["top", "bottom", "left", "right"];
const EDGE_LABELS: Record<Edge, string> = { top: "Trên", bottom: "Dưới", left: "Trái", right: "Phải" };

export default function BlockProperties({ block }: { block: BlockInstance }) {
  const doc = useEditorStore((s) => s.doc);
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const addPin = useEditorStore((s) => s.addPin);
  const removePin = useEditorStore((s) => s.removePin);
  const saveBlockToLibrary = useEditorStore((s) => s.saveBlockToLibrary);
  const library = useEditorStore((s) => s.library);
  const fileRef = useRef<HTMLInputElement>(null);
  const unit = doc.displayUnit;

  const field = (label: string, key: "x" | "y" | "w" | "h") => (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-stone-500">{label}</span>
      <input
        type="number"
        step={fromMm(1, unit)}
        defaultValue={fromMm(block[key], unit)}
        key={`${block.id}-${key}-${block[key]}`}
        onBlur={(e) => updateBlock(block.id, { [key]: toMm(Number(e.target.value), unit) } as any)}
        className="border border-stone-300 rounded px-2 py-1 text-sm"
      />
    </label>
  );

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateBlock(block.id, { imageDataUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  const nameExistsInLibrary = library.some((l) => l.name === block.name && l.name !== block.libraryName);

  return (
    <div className="flex flex-col gap-4 p-4 text-stone-800">
      <div>
        <label className="text-[11px] text-stone-500">Tên khối</label>
        <input
          defaultValue={block.name}
          key={`${block.id}-name`}
          onBlur={(e) => updateBlock(block.id, { name: e.target.value })}
          className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {field(`X (${unit})`, "x")}
        {field(`Y (${unit})`, "y")}
        {field(`Rộng (${unit})`, "w")}
        {field(`Cao (${unit})`, "h")}
      </div>

      <div>
        <label className="text-[11px] text-stone-500">Hình ảnh</label>
        <div className="flex items-center gap-2 mt-1">
          <button
            className="text-sm border border-stone-300 rounded px-2 py-1 hover:bg-stone-100"
            onClick={() => fileRef.current?.click()}
          >
            Tải ảnh…
          </button>
          {block.imageDataUrl && (
            <button
              className="text-sm text-red-600 hover:underline"
              onClick={() => updateBlock(block.id, { imageDataUrl: undefined })}
            >
              Xóa
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-[11px] text-stone-500">Chân cắm theo cạnh</label>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {EDGES.map((edge) => {
            const count = block.pins.filter((p) => p.edge === edge).length;
            return (
              <div key={edge} className="border border-stone-200 rounded px-2 py-1.5 flex items-center justify-between text-sm">
                <span>{EDGE_LABELS[edge]}</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs text-stone-500 w-4 text-center">{count}</span>
                  <button
                    className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 text-xs"
                    onClick={() => addPin(block.id, edge)}
                  >
                    +
                  </button>
                  <button
                    className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 text-xs"
                    disabled={count === 0}
                    onClick={() => {
                      const last = [...block.pins].reverse().find((p) => p.edge === edge);
                      if (last) removePin(block.id, last.id);
                    }}
                  >
                    −
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        className="mt-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded px-3 py-2"
        onClick={() => {
          if (nameExistsInLibrary && !window.confirm(`Ghi đè khối "${block.name}" trong thư viện?`)) return;
          saveBlockToLibrary(block.id);
        }}
      >
        Lưu vào thư viện
      </button>
    </div>
  );
}
