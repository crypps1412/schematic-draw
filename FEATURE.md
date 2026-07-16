# Schematic-Draw
Fast create schematic diagram with blocks and wires

## Features
[ ] Control canvas

    [x] Save
    [x] Load
    [x] Set name, size
        [x] Set name (click-to-edit in header)
        [ ] Set size after creation (canvas boundary drag-resize handles not wired up — `resizeCanvas()` exists in the store but nothing calls it yet)
    [x] Interact
        [x] View
        [x] Zoom
        [ ] Resize (canvas itself — see above; resizing *blocks* is done, see below)
    [x] Control
        [x] Add object
        [x] Select object
        [x] Move object
        [x] Delete object
        [x] Resize object
        [x] Select multi objects
        [x] Move multi objects

[ ] Blocks

    [x] Add empty block
    [x] Add block from library
    [x] Rename block
    [x] Edit position/size numerically (properties panel)
    [x] Upload custom image / fallback title text
    [x] Add/remove pins per edge, evenly spaced automatically
    [ ] Drag-and-drop a block from the sidebar onto the canvas (only click-to-spawn is wired up; drag handlers are stubbed)
    [x] Ctrl+drag to duplicate
    [x] Copy / Cut / Duplicate (Ctrl+C / Ctrl+X / Ctrl+D)
    [x] Arrow-key nudge (1 grid unit)

[ ] Wiring

    [x] Point-to-point auto routing (orthogonal, grid-based shortest path)
    [x] Manual routing (dominant-axis anchor placement)
    [x] Right-click to undo last anchor
    [x] Middle-click to cancel current wire
    [x] Wire color palette (select + rename)
    [x] Semicircular crossover "hop" bridges where wires cross
    [x] Select / hover highlight on wires
    [x] Edit wire color from properties panel
    [ ] Full "never overlaps a parallel wire" enforcement (blocked-cell routing avoids blocks, but doesn't yet penalize running parallel alongside an existing wire)

[ ] Comments

    [x] Add comment (default text)
    [x] Inline rich-text editing with floating toolbar
    [x] Move comment (drag), grid-snapped anchor
    [ ] Toolbar is `document.execCommand`-based — works, but flagged as a prototype-only approach in the README

[ ] Block library

    [x] Save selected block to the sidebar library (in-memory)
    [x] Load one or more block-template files (multi-file picker), replacing the previous set
    [x] Export the whole library as a single combined JSON file
    [x] Overwrite confirmation when saving a name that already exists

[ ] File management

    [x] Save canvas to a local JSON file
    [x] Open a canvas JSON file
    [x] New canvas dialog (prompts for name)

[ ] Navigation overlays

    [x] Minimap with click/drag to jump viewport (viewport-frame math is an approximation, noted in README)
    [x] Zoom +/- buttons and fit-to-view ("home") button
    [x] Search overlay with fuzzy subsequence matching, live pan-to-result

[ ] Not implemented yet

    [ ] Undo / redo history
    [ ] Canvas boundary drag-to-resize (with element coordinate shift)
    [ ] Sidebar drag-and-drop of assets onto canvas
    [ ] Collapsible sidebar tooltips-on-hover (collapse toggle works; hover tooltips not added)