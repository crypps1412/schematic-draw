// components/Header/HeaderBar.tsx
"use client";

import { useRef, useState } from "react";
import { useEditorStore, LibraryBlock } from "../../store/editorStore";
import { canvasFileName, downloadJson, readJsonFile } from "../../lib/serialization";
import { CanvasDoc, newCanvasDoc } from "../../lib/types";

export default function HeaderBar() {
  const doc = useEditorStore((s) => s.doc);
  const renameCanvas = useEditorStore((s) => s.renameCanvas);
  const loadDoc = useEditorStore((s) => s.loadDoc);
  const resetDoc = useEditorStore((s) => s.resetDoc);
  const loadLibraryFolder = useEditorStore((s) => s.loadLibraryFolder);
  const setLibraryDirectory = useEditorStore((s) => s.setLibraryDirectory);
  const libraryDirName = useEditorStore((s) => s.libraryDirName);

  const [editingName, setEditingName] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newName, setNewName] = useState("Mạch điện");

  const openInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

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
   * Preferred path: the File System Access API gives us a directory handle we
   * can both read from AND write new block files into later, so "Save to
   * Library" lands in the same folder the user picked here.
   */
  const handleChooseLibrary = async () => {
    console.log("HERERERERERE")
    if (window.showDirectoryPicker) {
      try {
        const handle = await window.showDirectoryPicker({ mode: "readwrite" });
        await setLibraryDirectory(handle);
        setMenuOpen(false);
      } catch {
        // user cancelled the picker — leave selection unchanged
      }
      return;
    }
    // Fallback for browsers without the File System Access API: can read the
    // folder's files but can't write back to it, so "Save to Library" will
    // only update the in-memory library in that case.
    // libraryInputRef.current?.click();
  };

  const handleLoadLibraryFallback = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("TERERERER")
    const allFiles = Array.from(e.target.files ?? []);
    const files = allFiles.filter((f) => f.name.endsWith(".json"));
    const blocks: LibraryBlock[] = [];
    for (const f of files) {
      try {
        const parsed = await readJsonFile<any>(f);
        blocks.push({ name: parsed.name ?? f.name.replace(/\.json$/, ""), block: parsed });
      } catch {
        // skip malformed entries
      }
    }
    const relPath = (allFiles[0] as any)?.webkitRelativePath as string | undefined;
    const dirName = relPath?.split("/")[0];
    loadLibraryFolder(blocks, dirName);
    setMenuOpen(false);
    e.target.value = "";
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

      <div className="w-52 flex justify-end relative">
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
            <MenuItem
              label="Chọn thư viện khối"
              subtitle={libraryDirName ? `Đang dùng: ${libraryDirName}` : undefined}
              onClick={handleChooseLibrary}
            />
          </div>
        )}
        <input ref={openInputRef} type="file" accept=".json" className="hidden" onChange={handleOpenFile} />
        <input
          ref={libraryInputRef}
          type="file"
          // @ts-ignore - non-standard attribute for folder selection
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
          onChange={handleLoadLibraryFallback}
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
