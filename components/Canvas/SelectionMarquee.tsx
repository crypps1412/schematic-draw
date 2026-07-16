// components/Canvas/SelectionMarquee.tsx
interface Props {
  rect: { x: number; y: number; w: number; h: number } | null;
}

export default function SelectionMarquee({ rect }: Props) {
  if (!rect) return null;
  return (
    <rect
      x={rect.x}
      y={rect.y}
      width={rect.w}
      height={rect.h}
      fill="#2563eb"
      fillOpacity={0.08}
      stroke="#2563eb"
      strokeWidth={1}
      strokeDasharray="4 3"
      pointerEvents="none"
    />
  );
}
