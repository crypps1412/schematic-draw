// lib/serialization.ts
import { BlockInstance, CanvasDoc } from "./types";

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function canvasFileName(doc: CanvasDoc): string {
  return `${doc.name.replace(/[\\/:*?"<>|]/g, "_")}.json`;
}

export function blockFileName(name: string): string {
  return `${name.replace(/[\\/:*?"<>|]/g, "_")}.json`;
}

export async function readJsonFile<T>(file: File): Promise<T> {
  const text = await file.text();
  return JSON.parse(text) as T;
}

/** Strip instance-only fields (id, position) so a block can be re-instantiated elsewhere. */
export function toLibraryPayload(block: BlockInstance) {
  const { id, x, y, ...rest } = block;
  return rest;
}
