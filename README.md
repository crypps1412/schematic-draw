# Schematic & Wiring Diagram Editor — component scaffold

Next.js (App Router) + TypeScript + Tailwind + SVG (used instead of Canvas —
easier hit-testing per element, which this spec needs a lot of: pins, wire
segments, resize handles, etc.).

## Setup

```bash
npm install
npm run dev
```

## File map

```
app/
  layout.tsx, page.tsx, globals.css        Next.js entry
lib/
  types.ts            Domain model (CanvasDoc, BlockInstance, Pin, WireInstance, CommentInstance)
  units.ts             SI unit <-> mm conversion + grid snapping
  geometry.ts          Pin layout math (symmetric spacing), rect helpers
  routing.ts           Orthogonal BFS auto-router + crossover "hop" bridge detection
  fuzzySearch.ts        Subsequence fuzzy match for the search overlay
  serialization.ts      Canvas/block JSON save & load
store/
  editorStore.ts        Zustand store — single source of truth + all mutations
components/
  Header/HeaderBar.tsx              Logo, click-to-edit name, File & Library menu
  Sidebar/AssetSidebar.tsx          Create block, saved-blocks combobox, wire color palette, comment tool
  Canvas/CanvasViewport.tsx         Pan/zoom/marquee/drag/resize orchestration (the core interaction hub)
  Canvas/GridBackground.tsx         Dotted grid pattern
  Canvas/BlockNode.tsx              Block body, pins, resize handles
  Canvas/WireLayer.tsx              Wire rendering incl. semicircular crossover hops
  Canvas/CommentNode.tsx            Inline-editable annotation
  Canvas/SelectionMarquee.tsx       Rubber-band selection rect
  PropertiesPanel/                  Right info sheet (block props / wire props) + floating rich-text toolbar
  Overlays/                         Minimap, zoom controls, search
hooks/
  useKeyboardShortcuts.ts           Copy/Cut/Duplicate/Delete/Arrow-nudge/Escape, right-click undo anchor
```

## What's implemented for real

- mm-resolution internal geometry with cm/m display conversion (spec §6)
- Symmetric, evenly-spaced pin layout per edge, recomputed on pin add/remove (spec §2)
- Orthogonal-only wire routing: grid BFS shortest path for point-to-point,
  dominant-axis manual routing, with a turn penalty to keep paths sane
- Crossover hop bridges: any horizontal segment crossing a vertical segment
  from a different wire gets a semicircular detour sized to one grid unit
- Pan (middle-drag), zoom (wheel / buttons), marquee multi-select, drag-move
  with wire re-routing on move, resize with grid snapping, Ctrl+drag duplicate
- Copy/Cut/Duplicate/Delete/Arrow-key nudge, right-click to undo the last
  manual wire anchor, middle-click to cancel wiring
- Canvas JSON export+import (Save/Open canvas).
- Block library, file-based (no folder/directory access, so it works in any
  browser without a secure-context requirement):
  - **"Nạp khối…"** opens a plain multi-file picker. Each selected `.json`
    file is either one block template or an array of them; the picked set
    always *replaces* whatever was loaded before (never merges).
  - **"Xuất thư viện khối"** downloads everything currently in the sidebar's
    library dropdown as a single combined JSON file — and that same file can
    be re-picked later via "Nạp khối…" since arrays are accepted on load.
  - The Properties Panel's "Lưu vào thư viện" button only appends/overwrites
    an entry in that in-memory sidebar list — it does not write to disk by
    itself; use "Xuất thư viện khối" afterward to persist it.
- Fuzzy subsequence search ("d t12" → "Điện trở 120") with live viewport pan

## What's simplified / left as a stub — worth hardening before production

- **Wire "never overlaps a block" / "never overlaps a parallel wire"**: the
  BFS avoids routing *through* block interiors, but doesn't yet penalize
  running parallel to an existing wire on the same grid line. Add a
  penalty/blocked-set keyed by occupied edges (not just cells) to fully
  enforce this.
- **Canvas boundary resize handles** (drag canvas edges to resize, auto-shift
  elements): `resizeCanvas(w, h, shiftOrigin)` exists in the store, but the
  drag handles themselves aren't wired into `CanvasViewport` yet.
- **Minimap viewport rectangle** uses an approximation (doc size / scale)
  rather than the exact on-screen mm extents — pass the container's px size
  into the minimap for a pixel-accurate frame.
- **Rich text toolbar** uses `document.execCommand`, which is deprecated;
  fine for a prototype, swap in Slate/Lexical/ProseMirror for production.
- **Undo/redo** isn't implemented — the store is a plain zustand store, so
  adding a history middleware (e.g. `zundo`) is the natural next step.
- Multi-select drag currently reroutes *all* wires touching any moved block
  on every pointer-move tick; fine at prototype scale, worth throttling or
  memoizing for large diagrams.

## Notes on library choices

- **zustand** for state — swap for Redux/Context if you'd rather not add
  the dependency; the component tree only touches the store through the
  `useEditorStore` hook, so the swap is isolated to `store/editorStore.ts`.
- **nanoid** for ids — any id generator works.
