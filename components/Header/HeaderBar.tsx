// components/Header/HeaderBar.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useEditorStore, LibraryBlock } from "../../store/editorStore";
import { canvasFileName, downloadJson, libraryFileName, readJsonFile } from "../../lib/serialization";
import { CanvasDoc } from "../../lib/types";

export default function HeaderBar() {
  const doc = useEditorStore((s) => s.doc);
  const renameCanvas = useEditorStore((s) => s.renameCanvas);
  const loadDoc = useEditorStore((s) => s.loadDoc);
  const resetDoc = useEditorStore((s) => s.resetDoc);
  const library = useEditorStore((s) => s.library);
  const loadBlockFiles = useEditorStore((s) => s.loadBlockFiles);

  const [editingName, setEditingName] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newName, setNewName] = useState("Mạch điện");

  const openInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    // capture phase so this still fires even if a child stops propagation
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const handleSave = () => downloadJson(canvasFileName(doc), doc);

  const handleOpenFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const parsed = await readJsonFile<CanvasDoc>(file);
    loadDoc(parsed);
    setMenuOpen(false);
    e.target.value = "";
  };

  /**
   * Picking new block files always REPLACES the currently loaded library
   * (never merges). Each selected file may contain either a single block
   * template, or an array of them (so re-importing a previously exported
   * library file also works).
   */
  const handlePickBlockFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.name.endsWith(".json"));
    const blocks: LibraryBlock[] = [];
    for (const f of files) {
      try {
        const parsed = await readJsonFile<any>(f);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          blocks.push({ name: item.name ?? f.name.replace(/\.json$/, ""), block: item });
        }
      } catch {
        // skip malformed entries
      }
    }
    loadBlockFiles(blocks);
    setMenuOpen(false);
    e.target.value = "";
  };

  const handleExportLibrary = () => {
    const payload = library.map((l) => l.block);
    downloadJson(libraryFileName(), payload);
    setMenuOpen(false);
  };

  const confirmNewCanvas = () => {
    resetDoc(newName);
    setNewDialogOpen(false);
    setMenuOpen(false);
  };

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-stone-300 bg-[#20242b] text-stone-100">
      <div className="flex items-center gap-2 w-52">
        <div className="w-7 h-7 rounded-sm bg-amber-500 grid place-items-center font-mono text-xs font-bold text-[#20242b]">
          SC
        </div>
        <span className="font-semibold tracking-tight text-sm">Schema.io</span>
      </div>

      <div className="flex-1 flex justify-center">
        {editingName ? (
          <input
            autoFocus
            defaultValue={doc.name}
            onBlur={(e) => {
              renameCanvas(e.target.value || doc.name);
              setEditingName(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="bg-transparent border-b border-amber-400 text-center text-sm px-2 py-1 outline-none"
          />
        ) : (
          <button
            className="text-sm px-2 py-1 rounded hover:bg-white/10 font-mono"
            onClick={() => setEditingName(true)}
            title="Bấm để đổi tên"
          >
            {doc.name}
          </button>
        )}
      </div>

      <div ref={menuContainerRef} className="w-52 flex justify-end relative">
        <button
          className="text-sm px-3 py-1.5 rounded border border-white/20 hover:bg-white/10"
          onClick={() => setMenuOpen((v) => !v)}
        >
          Tệp & Thư viện
        </button>
        {menuOpen && (
          <div className="absolute top-10 right-0 w-56 rounded-md border border-stone-300 bg-white text-stone-800 shadow-lg text-sm py-1 z-30">
            <MenuItem label="Bản vẽ mới" onClick={() => setNewDialogOpen(true)} />
            <MenuItem label="Lưu bản vẽ" onClick={handleSave} />
            <MenuItem label="Mở bản vẽ…" onClick={() => openInputRef.current?.click()} />
            <div className="h-px bg-stone-200 my-1" />
            <MenuItem label="Nạp khối…" onClick={() => libraryInputRef.current?.click()} />
            <MenuItem
              label="Xuất thư viện khối"
              subtitle={library.length ? `${library.length} khối đã nạp` : "Chưa có khối nào"}
              onClick={handleExportLibrary}
            />
          </div>
        )}
        <input ref={openInputRef} type="file" accept=".json" className="hidden" onChange={handleOpenFile} />
        <input
          ref={libraryInputRef}
          type="file"
          accept=".json"
          multiple
          className="hidden"
          onChange={handlePickBlockFiles}
        />
      </div>

      {newDialogOpen && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
          <div className="bg-white rounded-lg p-5 w-80 shadow-xl">
            <h3 className="text-sm font-semibold mb-3 text-stone-800">Bản vẽ mới</h3>
            <label className="text-xs text-stone-500">Tên bản vẽ</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm mt-1 mb-4"
            />
            <div className="flex justify-end gap-2 text-sm">
              <button className="px-3 py-1.5 rounded hover:bg-stone-100" onClick={() => setNewDialogOpen(false)}>
                Hủy
              </button>
              <button className="px-3 py-1.5 rounded bg-amber-500 text-white hover:bg-amber-600" onClick={confirmNewCanvas}>
                Tạo
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function MenuItem({ label, subtitle, onClick }: { label: string; subtitle?: string; onClick: () => void }) {
  return (
    <button className="w-full text-left px-3 py-1.5 hover:bg-stone-100" onClick={onClick}>
      <div>{label}</div>
      {subtitle && <div className="text-[11px] text-stone-400 truncate">{subtitle}</div>}
    </button>
  );
}
