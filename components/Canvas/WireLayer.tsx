// components/Canvas/WireLayer.tsx
import { WireColor, WireInstance } from "../../lib/types";
import { findHopCrossings } from "../../lib/routing";

interface Props {
  wires: WireInstance[];
  wireColors: WireColor[];
  gridPitchMm: number;
  selectedId: string | null;
  hoveredId: string | null;
  mmToPx: number;
  onSelect: (id: string, additive: boolean) => void;
  onHover: (id: string | null) => void;
}

function colorFor(colorId: string, colors: WireColor[]): string {
  return colors.find((c) => c.id === colorId)?.swatch ?? "#333";
}

/** Build a path `d` string with a semicircular detour at each hop point. */
function buildPathD(wire: WireInstance, hops: { center: { x: number; y: number }; radiusMm: number }[]) {
  const pts = wire.path;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const isHorizontal = a.y === b.y;
    if (!isHorizontal) {
      d += ` L ${b.x} ${b.y}`;
      continue;
    }
    // horizontal segment: insert hop arcs for any crossings that fall on it, left-to-right order
    const dir = b.x >= a.x ? 1 : -1;
    const segHops = hops
      .filter((h) => h.center.y === a.y && Math.min(a.x, b.x) < h.center.x && h.center.x < Math.max(a.x, b.x))
      .sort((h1, h2) => dir * (h1.center.x - h2.center.x));
    let cursorX = a.x;
    for (const h of segHops) {
      const r = h.radiusMm;
      const enter = h.center.x - dir * r;
      const exit = h.center.x + dir * r;
      d += ` L ${enter} ${a.y}`;
      // semicircle arcing away from the line (upward, i.e. -y) over the crossing
      const sweep = dir > 0 ? 1 : 0;
      d += ` A ${r} ${r} 0 0 ${sweep} ${exit} ${a.y}`;
      cursorX = exit;
    }
    d += ` L ${b.x} ${b.y}`;
  }
  return d;
}

export default function WireLayer({
  wires,
  wireColors,
  gridPitchMm,
  selectedId,
  hoveredId,
  mmToPx,
  onSelect,
  onHover,
}: Props) {
  const hops = findHopCrossings(wires, gridPitchMm);

  return (
    <g>
      {wires.map((wire) => {
        const isSelected = wire.id === selectedId;
        const isHovered = wire.id === hoveredId;
        const color = colorFor(wire.colorId, wireColors);
        const colorMeta = wireColors.find((c) => c.id === wire.colorId);
        const d = buildPathD(wire, hops);
        const strokeWidth = (isSelected || isHovered ? gridPitchMm * 0.09 : gridPitchMm * 0.06);
        return (
          <g key={wire.id}>
            {/* wide invisible hit path, easier to click than the thin wire */}
            <path
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth={gridPitchMm * 0.5}
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelect(wire.id, e.shiftKey);
              }}
              onPointerEnter={() => onHover(wire.id)}
              onPointerLeave={() => onHover(null)}
              style={{ cursor: "pointer" }}
            />
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={colorMeta?.striped ? `${gridPitchMm * 0.12} ${gridPitchMm * 0.08}` : undefined}
              strokeLinecap="round"
            />
            {(isSelected || isHovered) && (
              <path
                d={d}
                fill="none"
                stroke={isSelected ? "#c0392b" : "#2563eb"}
                strokeWidth={strokeWidth + gridPitchMm * 0.05}
                opacity={0.35}
                strokeLinecap="round"
              />
            )}
          </g>
        );
      })}
    </g>
  );
}
