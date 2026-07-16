// components/SchematicEditor.tsx
"use client";

import HeaderBar from "./Header/HeaderBar";
import AssetSidebar from "./Sidebar/AssetSidebar";
import CanvasViewport from "./Canvas/CanvasViewport";
import PropertiesPanel from "./PropertiesPanel/PropertiesPanel";
import SearchOverlay from "./Overlays/SearchOverlay";
import useKeyboardShortcuts from "../hooks/useKeyboardShortcuts";

export default function SchematicEditor() {
  useKeyboardShortcuts();

  return (
    <div className="w-screen h-screen flex flex-col bg-stone-100 font-sans">
      <HeaderBar />
      <div className="flex-1 flex min-h-0">
        <AssetSidebar />
        <div className="relative flex-1 min-w-0">
          <CanvasViewport />
          <SearchOverlay />
        </div>
        <PropertiesPanel />
      </div>
    </div>
  );
}
