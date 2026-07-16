// components/Canvas/CanvasViewport.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditorStore, blocksOf, wiresOf } from "../../store/editorStore";
import { CommentInstance, Point } from "../../lib/types";
import { snapToGrid } from "../../lib/units";
import GridBackground from "./GridBackground";
import BlockNode from "./BlockNode";
import WireLayer from "./WireLayer";
import CommentNode from "./CommentNode";
import SelectionMarquee from "./SelectionMarquee";
import ZoomControls from "../Overlays/ZoomControls";
import MinimapOverlay from "../Overlays/MinimapOverlay";

type Mode =
  | { kind: "idle" }
  | { kind: "panning"; startClient: Point; startCenter: Point }
  | { kind: "marquee"; startMm: Point; currentMm: Point }
  | { kind: "dragging"; ids: string[]; lastMm: Point; isCtrlClone?: boolean }
  | { kind: "resizing"; id: string; corner: string; original: { x: number; y: number; w: number; h: number } };

export default function CanvasViewport() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);

  const doc = useEditorStore((s) => s.doc);
  const viewport = useEditorStore((s) => s.viewport);
  const setViewport = useEditorStore((s) => s.setViewport);
  const fitToView = useEditorStore((s) => s.fitToView);
  const selection = useEditorStore((s) => s.selection);
  const select = useEditorStore((s) => s.select);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const moveElements = useEditorStore((s) => s.moveElements);
  const resizeBlock = useEditorStore((s) => s.resizeBlock);
  const ctrlDragDuplicateBlock = useEditorStore((s) => s.ctrlDragDuplicateBlock);
  const setInspectorTarget = useEditorStore((s) => s.setInspectorTarget);
  const wiringTool = useEditorStore((s) => s.wiringTool);
  const beginWire = useEditorStore((s) => s.beginWire);
  const autoCompleteWire = useEditorStore((s) => s.autoCompleteWire);
  const addManualAnchor = useEditorStore((s) => s.addManualAnchor);
  const finishManualWire = useEditorStore((s) => s.finishManualWire);
  const cancelWiring = useEditorStore((s) => s.cancelWiring);
  const undoLastAnchor = useEditorStore((s) => s.undoLastAnchor);
  const updateComment = useEditorStore((s) => s.updateComment);

  const blocks = blocksOf(doc);
  const wires = wiresOf(doc);
  const comments = doc.elements.filter((e): e is CommentInstance => e.kind === "comment");

  // --- size + initial fit ---
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ w: width, h: height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    fitToView(containerSize.w, containerSize.h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const viewBox = {
    w: containerSize.w / viewport.scale,
    h: containerSize.h / viewport.scale,
  };
  const viewBoxX = viewport.centerX - viewBox.w / 2;
  const viewBoxY = viewport.centerY - viewBox.h / 2;

  const screenToMm = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = containerRef.current!.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      return { x: viewBoxX + (px / containerSize.w) * viewBox.w, y: viewBoxY + (py / containerSize.h) * viewBox.h };
    },
    [viewBoxX, viewBoxY, viewBox.w, viewBox.h, containerSize.w, containerSize.h]
  );

  // --- pan / zoom / marquee on background ---
  const onBackgroundPointerDown = (e: React.PointerEvent) => {
    if (e.button === 1) {
      setMode({ kind: "panning", startClient: { x: e.clientX, y: e.clientY }, startCenter: { x: viewport.centerX, y: viewport.centerY } });
      return;
    }
    if (wiringTool.active) {
      // background click while routing = manual anchor
      addManualAnchor(screenToMm(e.clientX, e.clientY));
      return;
    }
    if (e.button === 0) {
      const p = screenToMm(e.clientX, e.clientY);
      setMode({ kind: "marquee", startMm: p, currentMm: p });
      if (!e.shiftKey) clearSelection();
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (mode.kind === "panning") {
      const dxPx = e.clientX - mode.startClient.x;
      const dyPx = e.clientY - mode.startClient.y;
      setViewport({
        centerX: mode.startCenter.x - dxPx / viewport.scale,
        centerY: mode.startCenter.y - dyPx / viewport.scale,
      });
    } else if (mode.kind === "marquee") {
      setMode({ ...mode, currentMm: screenToMm(e.clientX, e.clientY) });
    } else if (mode.kind === "dragging") {
      const p = screenToMm(e.clientX, e.clientY);
      const dx = snapToGrid(p.x - mode.lastMm.x, doc.gridPitchMm);
      const dy = snapToGrid(p.y - mode.lastMm.y, doc.gridPitchMm);
      if (dx || dy) {
        moveElements(mode.ids, dx, dy);
        setMode({ ...mode, lastMm: { x: mode.lastMm.x + dx, y: mode.lastMm.y + dy } });
      }
    } else if (mode.kind === "resizing") {
      const p = screenToMm(e.clientX, e.clientY);
      const o = mode.original;
      let { x, y, w, h } = o;
      if (mode.corner.includes("w")) {
        w = o.x + o.w - p.x;
        x = p.x;
      }
      if (mode.corner.includes("e")) {
        w = p.x - o.x;
      }
      if (mode.corner.includes("n")) {
        h = o.y + o.h - p.y;
        y = p.y;
      }
      if (mode.corner.includes("s")) {
        h = p.y - o.y;
      }
      resizeBlock(mode.id, { x, y, w: Math.max(doc.gridPitchMm, w), h: Math.max(doc.gridPitchMm, h) });
    }
  };

  const onPointerUp = () => {
    if (mode.kind === "marquee") {
      const x = Math.min(mode.startMm.x, mode.currentMm.x);
      const y = Math.min(mode.startMm.y, mode.currentMm.y);
      const w = Math.abs(mode.currentMm.x - mode.startMm.x);
      const h = Math.abs(mode.currentMm.y - mode.startMm.y);
      const box = { x, y, w, h };
      const enclosed = blocks
        .filter((b) => b.x >= box.x && b.y >= box.y && b.x + b.w <= box.x + box.w && b.y + b.h <= box.y + box.h)
        .map((b) => b.id)
        .concat(
          comments
            .filter((c) => c.x >= box.x && c.x <= box.x + box.w && c.y >= box.y && c.y <= box.y + box.h)
            .map((c) => c.id)
        );
      if (enclosed.length) select(enclosed, true);
    }
    setMode({ kind: "idle" });
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.001);
    setViewport({ scale: Math.min(8, Math.max(0.05, viewport.scale * factor)) });
  };

  // --- block drag/resize handlers passed down ---
  const startDragBlock = (e: React.PointerEvent, id: string) => {
    if (e.ctrlKey || e.metaKey) {
      const p = screenToMm(e.clientX, e.clientY);
      const newId = ctrlDragDuplicateBlock(id, p);
      setMode({ kind: "dragging", ids: [newId], lastMm: p, isCtrlClone: true });
      return;
    }
    const ids = selection.has(id) ? Array.from(selection) : [id];
    if (!selection.has(id)) select([id]);
    setMode({ kind: "dragging", ids, lastMm: screenToMm(e.clientX, e.clientY) });
  };

  const startResize = (e: React.PointerEvent, id: string, corner: string) => {
    const b = blocks.find((bl) => bl.id === id);
    if (!b) return;
    setMode({ kind: "resizing", id, corner, original: { x: b.x, y: b.y, w: b.w, h: b.h } });
  };

  const onPinClick = (blockId: string, pinId: string) => {
    if (!wiringTool.active) {
      beginWire(blockId, pinId);
    } else if (!wiringTool.manual) {
      autoCompleteWire(blockId, pinId);
    } else {
      finishManualWire(blockId, pinId);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelWiring();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancelWiring]);

  const marqueeRect =
    mode.kind === "marquee"
      ? {
          x: Math.min(mode.startMm.x, mode.currentMm.x),
          y: Math.min(mode.startMm.y, mode.currentMm.y),
          w: Math.abs(mode.currentMm.x - mode.startMm.x),
          h: Math.abs(mode.currentMm.y - mode.startMm.y),
        }
      : null;

  const selectedSingleId = selection.size === 1 ? Array.from(selection)[0] : null;

  return (
    <div ref={containerRef} className="relative flex-1 h-full overflow-hidden bg-stone-200">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${viewBoxX} ${viewBoxY} ${viewBox.w} ${viewBox.h}`}
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
        onClick={() => {
          if (mode.kind === "idle" && selectedSingleId) setInspectorTarget(selectedSingleId);
        }}
        style={{ touchAction: "none", cursor: mode.kind === "panning" ? "grabbing" : "default" }}
      >
        <GridBackground widthMm={doc.widthMm} heightMm={doc.heightMm} gridPitchMm={doc.gridPitchMm} />

        <WireLayer
          wires={wires}
          wireColors={doc.wireColors}
          gridPitchMm={doc.gridPitchMm}
          selectedId={selectedSingleId}
          hoveredId={hoveredId}
          mmToPx={viewport.scale}
          onSelect={(id, additive) => {
            select([id], additive);
            setInspectorTarget(id);
          }}
          onHover={setHoveredId}
        />

        {comments.map((c) => (
          <CommentNode
            key={c.id}
            comment={c}
            selected={selection.has(c.id)}
            hovered={hoveredId === c.id}
            mmToPx={viewport.scale}
            onSelect={(id, additive) => select([id], additive)}
            onHover={setHoveredId}
            onChange={updateComment}
            onPointerDownBody={(e) => startDragBlock(e, c.id)}
          />
        ))}

        {blocks.map((b) => (
          <BlockNode
            key={b.id}
            block={b}
            gridPitchMm={doc.gridPitchMm}
            selected={selection.has(b.id)}
            hovered={hoveredId === b.id}
            mmToPx={viewport.scale}
            onPointerDownBody={(e) => startDragBlock(e, b.id)}
            onPointerDownResize={(e, corner) => startResize(e, b.id, corner)}
            onHover={setHoveredId}
            onSelect={(id, additive) => {
              select([id], additive);
              setInspectorTarget(id);
            }}
            onPinClick={onPinClick}
            hoveredPinId={hoveredPinId}
            onPinHover={setHoveredPinId}
          />
        ))}

        {wiringTool.active && (
          <polyline
            points={wiringTool.anchors.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#2563eb"
            strokeDasharray={`${doc.gridPitchMm * 0.15} ${doc.gridPitchMm * 0.1}`}
            strokeWidth={doc.gridPitchMm * 0.05}
          />
        )}

        <SelectionMarquee rect={marqueeRect} />
      </svg>

      <MinimapOverlay />
      <ZoomControls />
    </div>
  );
}
