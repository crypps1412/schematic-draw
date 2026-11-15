// components/Overlays/SearchOverlay.tsx
import { useMemo, useState } from "react";
import { useEditorStore, blocksOf } from "../../store/editorStore";
import { fuzzySearchList } from "../../lib/fuzzySearch";
import { CommentInstance } from "../../lib/types";

export default function SearchOverlay() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const doc = useEditorStore((s) => s.doc);
  const setViewport = useEditorStore((s) => s.setViewport);
  const select = useEditorStore((s) => s.select);
  const panelOpen = useEditorStore((s) => s.inspectorTargetId !== null);

  const searchable = useMemo(() => {
    const blocks = blocksOf(doc).map((b) => ({ id: b.id, name: b.name, x: b.x + b.w / 2, y: b.y + b.h / 2 }));
    const comments = doc.elements
      .filter((e): e is CommentInstance => e.kind === "comment")
      .map((c) => ({ id: c.id, name: c.html.replace(/<[^>]+>/g, ""), x: c.x, y: c.y }));
    return [...blocks, ...comments];
  }, [doc]);

  const results = query ? fuzzySearchList(query, searchable) : [];

  const jumpTo = (id: string, x: number, y: number) => {
    setViewport({ centerX: x, centerY: y });
    select([id]);
  };

  return (
    <div
      className={`absolute top-4 flex flex-col items-end gap-1 transition-[right] ${
        panelOpen ? "right-[21rem]" : "right-4"
      }`}
    >
      {!open ? (
        <button
          className="w-9 h-9 rounded-md border border-stone-300 bg-white shadow-sm grid place-items-center hover:bg-stone-100"
          onClick={() => setOpen(true)}
          title="Tìm kiếm"
        >
          🔍
        </button>
      ) : (
        <div className="w-64 rounded-md border border-stone-300 bg-white/95 backdrop-blur shadow-md">
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              const r = fuzzySearchList(e.target.value, searchable);
              if (r[0]) setViewport({ centerX: r[0].x, centerY: r[0].y });
            }}
            onBlur={() => !query && setOpen(false)}
            placeholder="Tìm khối, ghi chú…"
            className="w-full px-3 py-2 text-sm outline-none bg-transparent"
          />
          {results.length > 0 && (
            <ul className="max-h-52 overflow-auto border-t border-stone-200">
              {results.map((r) => (
                <li
                  key={r.id}
                  className="px-3 py-1.5 text-sm hover:bg-stone-100 cursor-pointer truncate"
                  onClick={() => jumpTo(r.id, r.x, r.y)}
                >
                  {r.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
