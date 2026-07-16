// lib/units.ts
// All internal geometry lives in millimeters at 1mm resolution (spec section 6).
// These helpers convert only at the UI boundary (inputs, labels).

import { SiUnit } from "./types";

const MM_PER_UNIT: Record<SiUnit, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
};

/** Round to the nearest whole millimeter — the internal resolution floor. */
export function roundMm(valueMm: number): number {
  return Math.round(valueMm);
}

export function toMm(value: number, unit: SiUnit): number {
  return roundMm(value * MM_PER_UNIT[unit]);
}

export function fromMm(valueMm: number, unit: SiUnit): number {
  return valueMm / MM_PER_UNIT[unit];
}

/** Format a mm value for display in the given unit, trimming trailing zeros. */
export function formatMm(valueMm: number, unit: SiUnit, maxDecimals = 2): string {
  const v = fromMm(valueMm, unit);
  const rounded = Number(v.toFixed(maxDecimals));
  return `${rounded}${unit}`;
}

/** Snap a mm coordinate to the nearest grid intersection for a given pitch. */
export function snapToGrid(valueMm: number, gridPitchMm: number): number {
  return Math.round(valueMm / gridPitchMm) * gridPitchMm;
}

export function snapPointToGrid<T extends { x: number; y: number }>(
  point: T,
  gridPitchMm: number
): T {
  return {
    ...point,
    x: snapToGrid(point.x, gridPitchMm),
    y: snapToGrid(point.y, gridPitchMm),
  };
}
