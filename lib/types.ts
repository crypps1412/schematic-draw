// lib/types.ts
// Domain model for the schematic / wiring diagram editor.
// All persisted geometry is stored in millimeters (mm), 1mm resolution,
// per spec section 6 ("System Units"). UI-facing components convert
// to/from the canvas's display unit (cm, m, etc.) only at the edges.

export type Edge = "top" | "bottom" | "left" | "right";

export type ElementKind = "block" | "wire" | "comment";

export interface Point {
  x: number; // mm
  y: number; // mm
}

export interface Pin {
  id: string;
  edge: Edge;
  /** Position along the edge, 0..1, evenly spaced by the block. Derived, not hand-set. */
  index: number;
  /** Total pin count on this edge, kept alongside index so layout stays symmetric on resize. */
  countOnEdge: number;
  label?: string;
}

export interface BlockInstance {
  kind: "block";
  id: string;
  name: string;
  x: number; // mm, top-left
  y: number; // mm, top-left
  w: number; // mm
  h: number; // mm
  imageDataUrl?: string;
  pins: Pin[];
  /** True once saved to / loaded from the reusable block library — used to offer "overwrite" on re-save. */
  libraryName?: string;
}

export interface WireColor {
  id: string;
  /** Hex or CSS color, may render as a striped pattern id for e.g. green-yellow */
  swatch: string;
  name: string;
  striped?: boolean;
}

export interface WireEndpoint {
  blockId: string;
  pinId: string;
}

export interface WireInstance {
  kind: "wire";
  id: string;
  colorId: string;
  from: WireEndpoint;
  to: WireEndpoint;
  /** Grid-aligned waypoints in mm, INCLUDING the two pin terminal points. Manual routing appends to this. */
  path: Point[];
  /** true while the user is mid-manual-route and has not yet clicked the destination pin */
  isRouting?: boolean;
}

export interface CommentInstance {
  kind: "comment";
  id: string;
  x: number; // mm, anchor = center point, snapped to grid
  y: number; // mm
  html: string; // rich text content
  fontSize: number;
  align: "left" | "center" | "right";
  bold?: boolean;
}

export type CanvasElement = BlockInstance | WireInstance | CommentInstance;

export type SiUnit = "mm" | "cm" | "m";

export interface CanvasDoc {
  name: string;
  widthMm: number;
  heightMm: number;
  /** Grid pitch in mm — "1 grid unit = N mm" */
  gridPitchMm: number;
  displayUnit: SiUnit;
  wireColors: WireColor[];
  elements: CanvasElement[];
}

export interface Viewport {
  /** mm-space point currently at the center of the screen */
  centerX: number;
  centerY: number;
  /** screen px per mm */
  scale: number;
}

export type SelectionId = string;

export const DEFAULT_WIRE_COLORS: WireColor[] = [
  { id: "red", swatch: "#c0392b", name: "Đỏ" },
  { id: "black", swatch: "#1c1c1c", name: "Đen" },
  { id: "brown", swatch: "#7b4b2a", name: "Nâu" },
  { id: "blue", swatch: "#2158a6", name: "Xanh dương" },
  { id: "green-yellow", swatch: "#3c9a3c", name: "Xanh/Vàng sọc", striped: true },
];

export function newCanvasDoc(name = "Mạch điện"): CanvasDoc {
  return {
    name,
    widthMm: 3000,
    heightMm: 2000,
    gridPitchMm: 50, // e.g. 1 unit = 5cm
    displayUnit: "cm",
    wireColors: DEFAULT_WIRE_COLORS,
    elements: [],
  };
}
