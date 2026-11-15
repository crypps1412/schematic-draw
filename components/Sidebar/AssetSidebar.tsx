// components/Sidebar/AssetSidebar.tsx
"use client";

import { useState } from "react";
import { useEditorStore } from "../../store/editorStore";

export default function AssetSidebar() {
  const collapsed = useEditorStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useEditorStore((s) => s.toggleSidebar);
  const addBlock = useEditorStore((s) => s.addBlock);
  const addBlockFromLibrary = useEditorStore((s) => s.addBlockFromLibrary);
  const addComment = useEditorStore((s) => s.addComment);
  const library = useEditorStore((s) => s.library);
  const wireColors = useEditorStore((s) => s.doc.wireColors);
  const activeWireColorId = useEditorStore((s) => s.activeWireColorId);
  const setActiveWireColor = useEditorStore((s) => s.setActiveWireColor);
  const renameWireColor = useEditorStore((s) => s.renameWireColor);
  const viewport = useEditorStore((s) => s.viewport);

  const [editingColorId, setEditingColorId] = useState<string | null>(null);

  const spawnAtCenter = (fn: () => void) => fn();

  return (
    <aside
      className={`shrink-0 h-full border-r border-stone-300 bg-[#f5f2ea] flex flex-col transition-all ${
        collapsed ? "w-14" : "w-64"
      }`}
    >
      <button
        className="h-9 flex items-center justify-end px-2 text-stone-500 hover:text-stone-800 text-xs"
        onClick={toggleSidebar}
      >
        {collapsed ? "»" : "« Thu gọn"}
      </button>

      <SidebarSection title="Khối" collapsed={collapsed}>
        <SidebarButton
          icon="▭"
          label="Khối trống"
          collapsed={collapsed}
          onClick={() => spawnAtCenter(() => addBlock())}
          draggable
          onDragStart={(e) => e.dataTransfer.setData("application/x-new-block", "empty")}
        />

        {!collapsed && (
          <div className="px-3 pt-1 pb-2">
            <label className="text-[11px] text-stone-500 uppercase tracking-wide">Khối đã lưu</label>
            <select
              className="w-full mt-1 text-sm border border-stone-300 rounded px-2 py-1.5 bg-white"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) addBlockFromLibrary(e.target.value, { x: viewport.centerX, y: viewport.centerY });
                e.target.value = "";
              }}
            >
              <option value="" disabled>
                {library.length ? "Chọn khối…" : "Chưa có khối nào"}
              </option>
              {library.map((l) => (
                <option key={l.name} value={l.name}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </SidebarSection>

      <SidebarSection title="Dây dẫn" collapsed={collapsed}>
        {!collapsed ? (
          <div className="px-3 pb-2 flex flex-col gap-1">
            {wireColors.map((c) => (
              <div
                key={c.id}
                className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-sm ${
                  activeWireColorId === c.id ? "bg-amber-100 border border-amber-300" : "hover:bg-stone-100"
                }`}
                onClick={() => setActiveWireColor(c.id)}
              >
                <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ background: c.swatch }} />
                {editingColorId === c.id ? (
                  <input
                    autoFocus
                    defaultValue={c.name}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      renameWireColor(c.id, e.target.value || c.name);
                      setEditingColorId(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                    className="flex-1 border-b border-stone-300 bg-transparent outline-none text-sm"
                  />
                ) : (
                  <span
                    className="flex-1 truncate"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingColorId(c.id);
                    }}
                  >
                    {c.name}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 pb-2">
            {wireColors.map((c) => (
              <button
                key={c.id}
                className={`w-6 h-6 rounded-full border ${activeWireColorId === c.id ? "border-amber-500 border-2" : "border-black/20"}`}
                style={{ background: c.swatch }}
                onClick={() => setActiveWireColor(c.id)}
                title={c.name}
              />
            ))}
          </div>
        )}
      </SidebarSection>

      <SidebarSection title="Ghi chú" collapsed={collapsed}>
        <SidebarButton
          icon="T"
          label="Chèn ghi chú"
          collapsed={collapsed}
          onClick={() => addComment({ x: viewport.centerX, y: viewport.centerY })}
        />
      </SidebarSection>
    </aside>
  );
}

function SidebarSection({
  title,
  collapsed,
  children,
}: {
  title: string;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-stone-200">
      {!collapsed && <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-stone-400 uppercase tracking-wide">{title}</div>}
      {children}
    </div>
  );
}

function SidebarButton({
  icon,
  label,
  collapsed,
  onClick,
  draggable,
  onDragStart,
}: {
  icon: string;
  label: string;
  collapsed: boolean;
  onClick: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}) {
  return (
    <button
      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-100"
      onClick={onClick}
      onDoubleClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      title={collapsed ? label : undefined}
    >
      <span className="w-5 text-center font-mono">{icon}</span>
      {!collapsed && <span>{label}</span>}
    </button>
  );
}
