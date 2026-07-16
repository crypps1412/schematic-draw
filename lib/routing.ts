// lib/routing.ts
// Orthogonal-only routing (spec section 3). Two pieces:
//  1. autoRoute() — grid BFS shortest-path for "click pin A, click pin B".
//  2. findHopCrossings() — for rendering: wherever a horizontal segment
//     crosses a vertical segment, the horizontal one gets a semicircular
//     "hop" bridge spanning exactly 1 grid unit.

import { BlockInstance, Point, WireInstance } from "./types";

type CellKey = string;
const key = (gx: number, gy: number): CellKey => `${gx},${gy}`;

interface Grid {
  pitch: number;
  cols: number;
  rows: number;
  blocked: Set<CellKey>;
}

function toGrid(p: Point, pitch: number) {
  return { gx: Math.round(p.x / pitch), gy: Math.round(p.y / pitch) };
}
function toMm(gx: number, gy: number, pitch: number): Point {
  return { x: gx * pitch, y: gy * pitch };
}

function buildBlockedGrid(
  blocks: BlockInstance[],
  canvasWMm: number,
  canvasHMm: number,
  pitch: number,
  ignoreBlockIds: Set<string>
): Grid {
  const cols = Math.ceil(canvasWMm / pitch) + 2;
  const rows = Math.ceil(canvasHMm / pitch) + 2;
  const blocked = new Set<CellKey>();
  for (const b of blocks) {
    if (ignoreBlockIds.has(b.id)) continue;
    const gx0 = Math.floor(b.x / pitch);
    const gy0 = Math.floor(b.y / pitch);
    const gx1 = Math.ceil((b.x + b.w) / pitch);
    const gy1 = Math.ceil((b.y + b.h) / pitch);
    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gy = gy0; gy <= gy1; gy++) {
        blocked.add(key(gx, gy));
      }
    }
  }
  return { pitch, cols, rows, blocked };
}

/**
 * Shortest orthogonal path between two mm points, avoiding block interiors.
 * Both points should already be grid-aligned (pin terminal points are).
 * Returns a waypoint list including start and end, or null if unreachable.
 */
export function autoRoute(
  start: Point,
  end: Point,
  blocks: BlockInstance[],
  canvasWMm: number,
  canvasHMm: number,
  gridPitchMm: number,
  ignoreBlockIds: Set<string> = new Set()
): Point[] | null {
  const grid = buildBlockedGrid(blocks, canvasWMm, canvasHMm, gridPitchMm, ignoreBlockIds);
  const s = toGrid(start, gridPitchMm);
  const e = toGrid(end, gridPitchMm);

  // BFS over (cell, direction-of-entry) so we can penalize turns and keep paths orthogonal & short.
  type Node = { gx: number; gy: number; dir: number }; // dir: -1 none, 0 horiz, 1 vert
  const dirs = [
    { dx: 1, dy: 0, dir: 0 },
    { dx: -1, dy: 0, dir: 0 },
    { dx: 0, dy: 1, dir: 1 },
    { dx: 0, dy: -1, dir: 1 },
  ];

  const startKey = (n: Node) => `${n.gx},${n.gy},${n.dir}`;
  const startNode: Node = { gx: s.gx, gy: s.gy, dir: -1 };
  const cameFrom = new Map<string, string>();
  const nodeOf = new Map<string, Node>();
  const dist = new Map<string, number>();
  dist.set(startKey(startNode), 0);
  nodeOf.set(startKey(startNode), startNode);

  // simple priority via array sorted by cost (small graphs — fine without a heap)
  let frontier: { node: Node; cost: number }[] = [{ node: startNode, cost: 0 }];
  let found: Node | null = null;

  const isBlocked = (gx: number, gy: number) => grid.blocked.has(key(gx, gy));

  while (frontier.length) {
    frontier.sort((a, b) => a.cost - b.cost);
    const { node, cost } = frontier.shift()!;
    const nk = startKey(node);
    if (dist.get(nk)! < cost) continue;
    if (node.gx === e.gx && node.gy === e.gy) {
      found = node;
      break;
    }
    for (const d of dirs) {
      const ngx = node.gx + d.dx;
      const ngy = node.gy + d.dy;
      if (ngx < -1 || ngy < -1 || ngx > grid.cols || ngy > grid.rows) continue;
      const isDestCell = ngx === e.gx && ngy === e.gy;
      if (isBlocked(ngx, ngy) && !isDestCell) continue;
      const turnPenalty = node.dir !== -1 && node.dir !== d.dir ? 1 : 0;
      const ncost = cost + 1 + turnPenalty;
      const nNode: Node = { gx: ngx, gy: ngy, dir: d.dir };
      const nk2 = startKey(nNode);
      if (dist.get(nk2) === undefined || dist.get(nk2)! > ncost) {
        dist.set(nk2, ncost);
        cameFrom.set(nk2, nk);
        nodeOf.set(nk2, nNode);
        frontier.push({ node: nNode, cost: ncost });
      }
    }
  }

  if (!found) return null;

  // Reconstruct path, then collapse collinear points into waypoints only at turns.
  const cellsRev: Node[] = [found];
  let cursor = startKey(found);
  while (cameFrom.has(cursor)) {
    cursor = cameFrom.get(cursor)!;
    cellsRev.push(nodeOf.get(cursor)!);
  }
  const cells = cellsRev.reverse();

  const waypoints: Point[] = [];
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    const p = toMm(c.gx, c.gy, gridPitchMm);
    if (waypoints.length < 2) {
      waypoints.push(p);
      continue;
    }
    const a = waypoints[waypoints.length - 2];
    const b = waypoints[waypoints.length - 1];
    const collinear =
      (a.x === b.x && b.x === p.x) || (a.y === b.y && b.y === p.y);
    if (collinear) {
      waypoints[waypoints.length - 1] = p; // extend the last segment
    } else {
      waypoints.push(p);
    }
  }
  // Ensure exact start/end (BFS snapped to grid already, but pins carry the true terminal point)
  waypoints[0] = start;
  waypoints[waypoints.length - 1] = end;
  return waypoints;
}

interface Segment {
  wireId: string;
  a: Point;
  b: Point;
  orientation: "h" | "v";
}

function segmentsOf(wire: WireInstance): Segment[] {
  const segs: Segment[] = [];
  for (let i = 0; i < wire.path.length - 1; i++) {
    const a = wire.path[i];
    const b = wire.path[i + 1];
    segs.push({ wireId: wire.id, a, b, orientation: a.y === b.y ? "h" : "v" });
  }
  return segs;
}

export interface HopPoint {
  wireId: string;
  segmentIndex: number;
  /** center of the hop, on the horizontal segment */
  center: Point;
  /** hop spans center.x - radius .. center.x + radius, at fixed y */
  radiusMm: number;
}

/**
 * For every horizontal segment that crosses a vertical segment (different wire),
 * compute a hop bridge. Span is exactly 1 grid unit per spec (radius = pitch/2).
 */
export function findHopCrossings(wires: WireInstance[], gridPitchMm: number): HopPoint[] {
  const allSegs = wires.flatMap(segmentsOf);
  const horiz = allSegs.filter((s) => s.orientation === "h");
  const vert = allSegs.filter((s) => s.orientation === "v");
  const hops: HopPoint[] = [];

  for (const h of horiz) {
    const y = h.a.y;
    const x0 = Math.min(h.a.x, h.b.x);
    const x1 = Math.max(h.a.x, h.b.x);
    for (const v of vert) {
      if (v.wireId === h.wireId) continue; // same-wire self overlap not hopped
      const x = v.a.x;
      const y0 = Math.min(v.a.y, v.b.y);
      const y1 = Math.max(v.a.y, v.b.y);
      const crosses = x > x0 && x < x1 && y > y0 && y < y1;
      if (crosses) {
        hops.push({
          wireId: h.wireId,
          segmentIndex: allSegs.indexOf(h),
          center: { x, y },
          radiusMm: gridPitchMm / 2,
        });
      }
    }
  }
  return hops;
}
