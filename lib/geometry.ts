// lib/geometry.ts
// Pin layout (symmetric, evenly spaced per edge) and block-relative geometry.
// See spec 2 "Pins System": an edge of length L with n pins places them at
// L/(n+1), 2L/(n+1), ... i.e. equal gaps between pins AND to the corners.

import { BlockInstance, Edge, Pin, Point } from "./types";

/** The pin "stub" length is 2 grid units: 1 inside the block, 1 outside. */
export function pinStubLengthMm(gridPitchMm: number): number {
  return gridPitchMm * 2;
}

/** Terminal (outer, connectable) point of a pin in absolute mm canvas coords. */
export function pinTerminalPoint(
  block: BlockInstance,
  pin: Pin,
  gridPitchMm: number
): Point {
  const along = edgePosition(block, pin);
  const stub = pinStubLengthMm(gridPitchMm) / 2; // outward half of the stub
  switch (pin.edge) {
    case "top":
      return { x: along.x, y: block.y - stub };
    case "bottom":
      return { x: along.x, y: block.y + block.h + stub };
    case "left":
      return { x: block.x - stub, y: along.y };
    case "right":
      return { x: block.x + block.w + stub, y: along.y };
  }
}

/** Point where the pin stub meets the block edge (inner end). */
export function pinEdgePoint(block: BlockInstance, pin: Pin): Point {
  return edgePosition(block, pin);
}

function edgePosition(block: BlockInstance, pin: Pin): Point {
  const n = pin.countOnEdge;
  // Evenly spaced with equal gaps to the corners: position k of n along length L
  // sits at k/(n+1) * L, for k = 1..n
  const k = pin.index + 1;
  const frac = k / (n + 1);
  switch (pin.edge) {
    case "top":
      return { x: block.x + frac * block.w, y: block.y };
    case "bottom":
      return { x: block.x + frac * block.w, y: block.y + block.h };
    case "left":
      return { x: block.x, y: block.y + frac * block.h };
    case "right":
      return { x: block.x + block.w, y: block.y + frac * block.h };
  }
}

/** Rebuild countOnEdge/index for every pin on a block after add/remove, keeping edges symmetric. */
export function renumberEdges(pins: Pin[]): Pin[] {
  const byEdge: Record<Edge, Pin[]> = { top: [], bottom: [], left: [], right: [] };
  for (const p of pins) byEdge[p.edge].push(p);
  const out: Pin[] = [];
  (Object.keys(byEdge) as Edge[]).forEach((edge) => {
    const list = byEdge[edge];
    list.forEach((p, i) => {
      out.push({ ...p, index: i, countOnEdge: list.length });
    });
  });
  return out;
}

export function blockContainsPoint(block: BlockInstance, p: Point): boolean {
  return p.x >= block.x && p.x <= block.x + block.w && p.y >= block.y && p.y <= block.y + block.h;
}

export function clampBlockToCanvas(
  block: Pick<BlockInstance, "x" | "y" | "w" | "h">,
  canvasWMm: number,
  canvasHMm: number
) {
  const x = Math.min(Math.max(0, block.x), canvasWMm - block.w);
  const y = Math.min(Math.max(0, block.y), canvasHMm - block.h);
  return { x, y };
}

export function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
