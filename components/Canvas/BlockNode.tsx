// components/Canvas/BlockNode.tsx
import { BlockInstance } from "../../lib/types";
import { pinEdgePoint, pinTerminalPoint } from "../../lib/geometry";
import { useEditorStore } from "../../store/editorStore";

interface Props {
  block: BlockInstance;
  gridPitchMm: number;
  selected: boolean;
  hovered: boolean;
  mmToPx: number;
  onPointerDownBody: (e: React.PointerEvent) => void;
  onPointerDownResize: (e: React.PointerEvent, corner: string) => void;
  onHover: (id: string | null) => void;
  onSelect: (id: string, additive: boolean) => void;
  onPinClick: (blockId: string, pinId: string) => void;
  hoveredPinId: string | null;
  onPinHover: (pinId: string | null) => void;
}

const RESIZE_HANDLES = ["nw", "ne", "sw", "se"] as const;

export default function BlockNode({
  block,
  gridPitchMm,
  selected,
  hovered,
  mmToPx,
  onPointerDownBody,
  onPointerDownResize,
  onHover,
  onSelect,
  onPinClick,
  hoveredPinId,
  onPinHover,
}: Props) {
  const strokeColor = selected ? "#c0392b" : hovered ? "#2563eb" : "#3a3a38";
  const strokeWidth = (selected || hovered ? 2 : 1.25) / mmToPx;
  const pinDotR = gridPitchMm * 0.09;

  return (
    <g
      onPointerEnter={() => onHover(block.id)}
      onPointerLeave={() => onHover(null)}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect(block.id, e.shiftKey);
        onPointerDownBody(e);
      }}
      style={{ cursor: "move" }}
    >
      <rect
        x={block.x}
        y={block.y}
        width={block.w}
        height={block.h}
        fill="#ffffff"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />

      {block.imageDataUrl ? (
        <image
          href={block.imageDataUrl}
          x={block.x}
          y={block.y}
          width={block.w}
          height={block.h}
          preserveAspectRatio="xMidYMid meet"
        />
      ) : (
        <text
          x={block.x + block.w / 2}
          y={block.y + block.h / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={Math.min(block.w, block.h) * 0.14}
          fontFamily="Inter, sans-serif"
          fill="#242320"
        >
          {block.name}
        </text>
      )}

      {block.pins.map((pin) => {
        const inner = pinEdgePoint(block, pin);
        const outer = pinTerminalPoint(block, pin, gridPitchMm);
        const isHovered = hoveredPinId === pin.id;
        return (
          <g
            key={pin.id}
            onPointerEnter={(e) => {
              e.stopPropagation();
              onPinHover(pin.id);
            }}
            onPointerLeave={(e) => {
              e.stopPropagation();
              onPinHover(null);
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onPinClick(block.id, pin.id);
            }}
            style={{ cursor: "crosshair" }}
          >
            <line
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke={isHovered ? "#2563eb" : "#1c1c1a"}
              strokeWidth={strokeWidth}
            />
            <circle
              cx={outer.x}
              cy={outer.y}
              r={isHovered ? pinDotR * 1.4 : pinDotR}
              fill={isHovered ? "#2563eb" : "#1c1c1a"}
            />
            {/* fat invisible hit target, larger than the visual dot */}
            <circle cx={outer.x} cy={outer.y} r={pinDotR * 3} fill="transparent" />
          </g>
        );
      })}

      {selected &&
        RESIZE_HANDLES.map((corner) => {
          const cx = corner.includes("w") ? block.x : block.x + block.w;
          const cy = corner.includes("n") ? block.y : block.y + block.h;
          const r = gridPitchMm * 0.12;
          return (
            <rect
              key={corner}
              x={cx - r}
              y={cy - r}
              width={r * 2}
              height={r * 2}
              fill="#ffffff"
              stroke="#c0392b"
              strokeWidth={strokeWidth}
              style={{ cursor: `${corner}-resize` }}
              onPointerDown={(e) => {
                e.stopPropagation();
                onPointerDownResize(e, corner);
              }}
            />
          );
        })}
    </g>
  );
}
