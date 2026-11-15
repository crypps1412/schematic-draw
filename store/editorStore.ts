// store/editorStore.ts
// Central state for the editor. One CanvasDoc + UI state (selection, viewport,
// clipboard, library, wiring-tool state). Uses zustand — swap for your own
// state layer if preferred, the component tree only depends on the hook shape below.

import { create } from "zustand";
import { nanoid } from "nanoid";
import {
  BlockInstance,
  CanvasDoc,
  CanvasElement,
  CommentInstance,
  Edge,
  Pin,
  Point,
  WireInstance,
  newCanvasDoc,
} from "../lib/types";
import { renumberEdges, pinTerminalPoint, clampBlockToCanvas } from "../lib/geometry";
import { autoRoute } from "../lib/routing";
import { snapToGrid } from "../lib/units";

export interface LibraryBlock {
  name: string;
  block: Omit<BlockInstance, "id" | "x" | "y">;
}

type WiringToolState =
  | { active: false }
  | {
      active: true;
      colorId: string;
      from: { blockId: string; pinId: string };
      anchors: Point[]; // manual anchors so far, terminal point of `from` is anchors[0]
      manual: boolean; // false until the user places a second click that isn't the destination pin
    };

interface EditorState {
  doc: CanvasDoc;
  selection: Set<string>;
  viewport: { centerX: number; centerY: number; scale: number };
  clipboard: CanvasElement[];
  library: LibraryBlock[];
  activeWireColorId: string;
  wiringTool: WiringToolState;
  sidebarCollapsed: boolean;
  inspectorTargetId: string | null;

  // --- document lifecycle ---
  loadDoc: (doc: CanvasDoc) => void;
  resetDoc: (name?: string) => void;
  renameCanvas: (name: string) => void;
  resizeCanvas: (widthMm: number, heightMm: number, shiftOrigin?: Point) => void;

  // --- blocks ---
  addBlock: (partial?: Partial<BlockInstance>, at?: Point) => string;
  addBlockFromLibrary: (name: string, at: Point) => string | null;
  updateBlock: (id: string, patch: Partial<BlockInstance>) => void;
  moveElements: (ids: string[], dxMm: number, dyMm: number) => void;
  resizeBlock: (id: string, rect: { x: number; y: number; w: number; h: number }) => void;
  addPin: (blockId: string, edge: Edge) => void;
  removePin: (blockId: string, pinId: string) => void;
  saveBlockToLibrary: (id: string) => void;

  // --- comments ---
  addComment: (at: Point) => string;
  updateComment: (id: string, patch: Partial<CommentInstance>) => void;

  // --- wiring tool ---
  setActiveWireColor: (colorId: string) => void;
  beginWire: (blockId: string, pinId: string) => void;
  autoCompleteWire: (blockId: string, pinId: string) => void;
  addManualAnchor: (point: Point) => void;
  finishManualWire: (blockId: string, pinId: string) => void;
  undoLastAnchor: () => void;
  cancelWiring: () => void;
  updateWireColor: (wireId: string, colorId: string) => void;
  renameWireColor: (colorId: string, name: string) => void;

  // --- selection / clipboard ---
  select: (ids: string[], additive?: boolean) => void;
  clearSelection: () => void;
  deleteSelection: () => void;
  copySelection: () => void;
  cutSelection: () => void;
  duplicateSelection: (at?: Point) => void;
  ctrlDragDuplicateBlock: (id: string, at: Point) => string;
  nudgeSelection: (dxUnits: number, dyUnits: number) => void;

  // --- viewport ---
  setViewport: (v: Partial<EditorState["viewport"]>) => void;
  fitToView: (screenW: number, screenH: number) => void;

  // --- misc UI ---
  toggleSidebar: () => void;
  setInspectorTarget: (id: string | null) => void;
  /**
   * Loads one or more block-template files, REPLACING whatever was previously
   * loaded (per-file: an object is one block; an array is treated as several
   * blocks, so an exported library file works here too).
   */
  loadBlockFiles: (blocks: LibraryBlock[]) => void;
}

function getBlock(doc: CanvasDoc, id: string): BlockInstance | undefined {
  return doc.elements.find((e) => e.id === id && e.kind === "block") as BlockInstance | undefined;
}

function getPin(block: BlockInstance, pinId: string): Pin | undefined {
  return block.pins.find((p) => p.id === pinId);
}

function blocksOf(doc: CanvasDoc): BlockInstance[] {
  return doc.elements.filter((e): e is BlockInstance => e.kind === "block");
}

function wiresOf(doc: CanvasDoc): WireInstance[] {
  return doc.elements.filter((e): e is WireInstance => e.kind === "wire");
}

/** Reroute every wire touching the given block ids (used after a move/resize). */
function rerouteAttached(doc: CanvasDoc, movedBlockIds: Set<string>): CanvasDoc {
  const blocks = blocksOf(doc);
  const elements = doc.elements.map((el) => {
    if (el.kind !== "wire") return el;
    const wire = el;
    if (!movedBlockIds.has(wire.from.blockId) && !movedBlockIds.has(wire.to.blockId)) return el;
    const fromBlock = blocks.find((b) => b.id === wire.from.blockId);
    const toBlock = blocks.find((b) => b.id === wire.to.blockId);
    if (!fromBlock || !toBlock) return el;
    const fromPin = getPin(fromBlock, wire.from.pinId);
    const toPin = getPin(toBlock, wire.to.pinId);
    if (!fromPin || !toPin) return el;
    const start = pinTerminalPoint(fromBlock, fromPin, doc.gridPitchMm);
    const end = pinTerminalPoint(toBlock, toPin, doc.gridPitchMm);
    const routed = autoRoute(
      start,
      end,
      blocks,
      doc.widthMm,
      doc.heightMm,
      doc.gridPitchMm,
      new Set([fromBlock.id, toBlock.id])
    );
    return { ...wire, path: routed ?? [start, end] };
  });
  return { ...doc, elements };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  doc: newCanvasDoc(),
  selection: new Set(),
  viewport: { centerX: 1500, centerY: 1000, scale: 1 },
  clipboard: [],
  library: [],
  activeWireColorId: newCanvasDoc().wireColors[0].id,
  wiringTool: { active: false },
  sidebarCollapsed: false,
  inspectorTargetId: null,

  loadDoc: (doc) => set({ doc, selection: new Set(), inspectorTargetId: null }),

  resetDoc: (name) => set({ doc: newCanvasDoc(name), selection: new Set(), inspectorTargetId: null }),

  renameCanvas: (name) => set((s) => ({ doc: { ...s.doc, name } })),

  resizeCanvas: (widthMm, heightMm, shiftOrigin) =>
    set((s) => {
      const dx = shiftOrigin?.x ?? 0;
      const dy = shiftOrigin?.y ?? 0;
      const elements =
        dx || dy
          ? s.doc.elements.map((el) => {
              if (el.kind === "block" || el.kind === "comment")
                return { ...el, x: el.x + dx, y: el.y + dy };
              if (el.kind === "wire")
                return { ...el, path: el.path.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
              return el;
            })
          : s.doc.elements;
      return { doc: { ...s.doc, widthMm, heightMm, elements } };
    }),

  addBlock: (partial, at) => {
    const id = nanoid(8);
    const state = get();
    const pitch = state.doc.gridPitchMm;
    const center = at ?? { x: state.viewport.centerX, y: state.viewport.centerY };
    const w = partial?.w ?? pitch * 6;
    const h = partial?.h ?? pitch * 4;
    const block: BlockInstance = {
      kind: "block",
      id,
      name: partial?.name ?? "Khối mới",
      x: snapToGrid(center.x - w / 2, pitch),
      y: snapToGrid(center.y - h / 2, pitch),
      w,
      h,
      pins: partial?.pins ?? [],
      imageDataUrl: partial?.imageDataUrl,
    };
    const clamped = clampBlockToCanvas(block, state.doc.widthMm, state.doc.heightMm);
    set((s) => ({ doc: { ...s.doc, elements: [...s.doc.elements, { ...block, ...clamped }] } }));
    return id;
  },

  addBlockFromLibrary: (name, at) => {
    const entry = get().library.find((l) => l.name === name);
    if (!entry) return null;
    return get().addBlock({ ...entry.block, libraryName: name }, at);
  },

  updateBlock: (id, patch) =>
    set((s) => ({
      doc: {
        ...s.doc,
        elements: s.doc.elements.map((e) => (e.id === id && e.kind === "block" ? { ...e, ...patch } : e)),
      },
    })),

  moveElements: (ids, dxMm, dyMm) => {
    set((s) => {
      const idSet = new Set(ids);
      const elements = s.doc.elements.map((el) => {
        if (!idSet.has(el.id)) return el;
        if (el.kind === "block" || el.kind === "comment") {
          const { x, y } = clampBlockToCanvas(
            { x: el.x + dxMm, y: el.y + dyMm, w: (el as BlockInstance).w ?? 0, h: (el as BlockInstance).h ?? 0 },
            s.doc.widthMm,
            s.doc.heightMm
          );
          return { ...el, x, y };
        }
        return el;
      });
      const moved = new Set(ids.filter((id) => getBlock({ ...s.doc, elements }, id)));
      return { doc: rerouteAttached({ ...s.doc, elements }, moved) };
    });
  },

  resizeBlock: (id, rect) => {
    set((s) => {
      const pitch = s.doc.gridPitchMm;
      const snapped = {
        x: snapToGrid(rect.x, pitch),
        y: snapToGrid(rect.y, pitch),
        w: Math.max(pitch, snapToGrid(rect.w, pitch)),
        h: Math.max(pitch, snapToGrid(rect.h, pitch)),
      };
      const elements = s.doc.elements.map((e) => (e.id === id && e.kind === "block" ? { ...e, ...snapped } : e));
      return { doc: rerouteAttached({ ...s.doc, elements }, new Set([id])) };
    });
  },

  addPin: (blockId, edge) =>
    set((s) => ({
      doc: {
        ...s.doc,
        elements: s.doc.elements.map((e) => {
          if (e.id !== blockId || e.kind !== "block") return e;
          const newPin: Pin = { id: nanoid(6), edge, index: 0, countOnEdge: 1 };
          return { ...e, pins: renumberEdges([...e.pins, newPin]) };
        }),
      },
    })),

  removePin: (blockId, pinId) =>
    set((s) => ({
      doc: {
        ...s.doc,
        // wires attached to a removed pin become invalid — spec forbids loose ends, so drop them too
        elements: s.doc.elements
          .map((e) => (e.id === blockId && e.kind === "block" ? { ...e, pins: renumberEdges(e.pins.filter((p) => p.id !== pinId)) } : e))
          .filter((e) => !(e.kind === "wire" && (e.from.pinId === pinId || e.to.pinId === pinId))),
      },
    })),

  saveBlockToLibrary: (id) => {
    const block = getBlock(get().doc, id);
    if (!block) return;
    const { id: _id, x: _x, y: _y, ...rest } = block;
    const entry: LibraryBlock = { name: block.name, block: rest };
    set((s) => {
      const existingIdx = s.library.findIndex((l) => l.name === block.name);
      const library =
        existingIdx >= 0
          ? s.library.map((l, i) => (i === existingIdx ? entry : l))
          : [...s.library, entry];
      return { library };
    });
  },

  addComment: (at) => {
    const id = nanoid(8);
    const pitch = get().doc.gridPitchMm;
    const comment: CommentInstance = {
      kind: "comment",
      id,
      x: snapToGrid(at.x, pitch),
      y: snapToGrid(at.y, pitch),
      html: "Ghi chú",
      fontSize: 14,
      align: "left",
    };
    set((s) => ({ doc: { ...s.doc, elements: [...s.doc.elements, comment] } }));
    return id;
  },

  updateComment: (id, patch) =>
    set((s) => ({
      doc: {
        ...s.doc,
        elements: s.doc.elements.map((e) => (e.id === id && e.kind === "comment" ? { ...e, ...patch } : e)),
      },
    })),

  setActiveWireColor: (colorId) => set({ activeWireColorId: colorId }),

  beginWire: (blockId, pinId) => {
    const s = get();
    const block = getBlock(s.doc, blockId);
    const pin = block && getPin(block, pinId);
    if (!block || !pin) return;
    const p = pinTerminalPoint(block, pin, s.doc.gridPitchMm);
    set({
      wiringTool: {
        active: true,
        colorId: s.activeWireColorId,
        from: { blockId, pinId },
        anchors: [p],
        manual: false,
      },
    });
  },

  autoCompleteWire: (blockId, pinId) => {
    const s = get();
    if (!s.wiringTool.active) return;
    const fromBlock = getBlock(s.doc, s.wiringTool.from.blockId);
    const fromPin = fromBlock && getPin(fromBlock, s.wiringTool.from.pinId);
    const toBlock = getBlock(s.doc, blockId);
    const toPin = toBlock && getPin(toBlock, pinId);
    if (!fromBlock || !fromPin || !toBlock || !toPin) return;
    const start = pinTerminalPoint(fromBlock, fromPin, s.doc.gridPitchMm);
    const end = pinTerminalPoint(toBlock, toPin, s.doc.gridPitchMm);
    const path = autoRoute(
      start,
      end,
      blocksOf(s.doc),
      s.doc.widthMm,
      s.doc.heightMm,
      s.doc.gridPitchMm,
      new Set([fromBlock.id, toBlock.id])
    ) ?? [start, end];
    const wire: WireInstance = {
      kind: "wire",
      id: nanoid(8),
      colorId: s.wiringTool.colorId,
      from: s.wiringTool.from,
      to: { blockId, pinId },
      path,
    };
    set((st) => ({ doc: { ...st.doc, elements: [...st.doc.elements, wire] }, wiringTool: { active: false } }));
  },

  addManualAnchor: (point) => {
    const s = get();
    if (!s.wiringTool.active) return;
    const last = s.wiringTool.anchors[s.wiringTool.anchors.length - 1];
    const dx = Math.abs(point.x - last.x);
    const dy = Math.abs(point.y - last.y);
    // Dominant-axis rule from spec Method 2: dx>dy -> horizontal segment, else vertical.
    const next: Point = dx > dy ? { x: point.x, y: last.y } : { x: last.x, y: point.y };
    set({
      wiringTool: { ...s.wiringTool, anchors: [...s.wiringTool.anchors, next], manual: true },
    });
  },

  finishManualWire: (blockId, pinId) => {
    const s = get();
    if (!s.wiringTool.active) return;
    const toBlock = getBlock(s.doc, blockId);
    const toPin = toBlock && getPin(toBlock, pinId);
    if (!toBlock || !toPin) return;
    const end = pinTerminalPoint(toBlock, toPin, s.doc.gridPitchMm);
    const path = [...s.wiringTool.anchors, end];
    const wire: WireInstance = {
      kind: "wire",
      id: nanoid(8),
      colorId: s.wiringTool.colorId,
      from: s.wiringTool.from,
      to: { blockId, pinId },
      path,
    };
    set((st) => ({ doc: { ...st.doc, elements: [...st.doc.elements, wire] }, wiringTool: { active: false } }));
  },

  undoLastAnchor: () =>
    set((s) => {
      if (!s.wiringTool.active || s.wiringTool.anchors.length <= 1) return { wiringTool: { active: false } };
      return { wiringTool: { ...s.wiringTool, anchors: s.wiringTool.anchors.slice(0, -1) } };
    }),

  cancelWiring: () => set({ wiringTool: { active: false } }),

  updateWireColor: (wireId, colorId) =>
    set((s) => ({
      doc: { ...s.doc, elements: s.doc.elements.map((e) => (e.id === wireId && e.kind === "wire" ? { ...e, colorId } : e)) },
    })),

  renameWireColor: (colorId, name) =>
    set((s) => ({
      doc: { ...s.doc, wireColors: s.doc.wireColors.map((c) => (c.id === colorId ? { ...c, name } : c)) },
    })),

  select: (ids, additive) =>
    set((s) => {
      if (!additive) return { selection: new Set(ids) };
      const next = new Set(s.selection);
      ids.forEach((id) => next.add(id));
      return { selection: next };
    }),

  clearSelection: () => set({ selection: new Set(), inspectorTargetId: null }),

  deleteSelection: () =>
    set((s) => {
      const ids = s.selection;
      const elements = s.doc.elements.filter((e) => {
        if (ids.has(e.id)) return false;
        // also drop wires attached to a deleted block
        if (e.kind === "wire" && (ids.has(e.from.blockId) || ids.has(e.to.blockId))) return false;
        return true;
      });
      return { doc: { ...s.doc, elements }, selection: new Set(), inspectorTargetId: null };
    }),

  copySelection: () =>
    set((s) => ({ clipboard: s.doc.elements.filter((e) => s.selection.has(e.id) && e.kind !== "wire") })),

  cutSelection: () => {
    get().copySelection();
    get().deleteSelection();
  },

  duplicateSelection: (at) => {
    const s = get();
    const items = s.doc.elements.filter((e) => s.selection.has(e.id) && e.kind !== "wire");
    if (!items.length) return;
    const pitch = s.doc.gridPitchMm;
    const anchor = at ?? { x: s.viewport.centerX, y: s.viewport.centerY };
    // offset so the group's bounding-box center lands on `anchor`
    const minX = Math.min(...items.map((i: any) => i.x));
    const minY = Math.min(...items.map((i: any) => i.y));
    const dx = snapToGrid(anchor.x - minX, pitch);
    const dy = snapToGrid(anchor.y - minY, pitch);
    const newIds: string[] = [];
    const clones = items.map((el) => {
      const id = nanoid(8);
      newIds.push(id);
      return { ...(el as any), id, x: (el as any).x + dx, y: (el as any).y + dy };
    });
    set((st) => ({ doc: { ...st.doc, elements: [...st.doc.elements, ...clones] }, selection: new Set(newIds) }));
  },

  ctrlDragDuplicateBlock: (id, at) => {
    const block = getBlock(get().doc, id);
    if (!block) return id;
    const newId = nanoid(8);
    const pitch = get().doc.gridPitchMm;
    const clone: BlockInstance = {
      ...block,
      id: newId,
      x: snapToGrid(at.x - block.w / 2, pitch),
      y: snapToGrid(at.y - block.h / 2, pitch),
    };
    set((s) => ({ doc: { ...s.doc, elements: [...s.doc.elements, clone] }, selection: new Set([newId]) }));
    return newId;
  },

  nudgeSelection: (dxUnits, dyUnits) => {
    const pitch = get().doc.gridPitchMm;
    get().moveElements(Array.from(get().selection), dxUnits * pitch, dyUnits * pitch);
  },

  setViewport: (v) => set((s) => ({ viewport: { ...s.viewport, ...v } })),

  fitToView: (screenW, screenH) =>
    set((s) => {
      const scale = Math.min(screenW / s.doc.widthMm, screenH / s.doc.heightMm) * 0.92;
      return { viewport: { centerX: s.doc.widthMm / 2, centerY: s.doc.heightMm / 2, scale } };
    }),

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  setInspectorTarget: (id) => set({ inspectorTargetId: id }),

  loadBlockFiles: (blocks) => set({ library: blocks }),
}));

export { blocksOf, wiresOf, getBlock, getPin };
