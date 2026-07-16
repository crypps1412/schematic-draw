// components/Canvas/GridBackground.tsx
// Dotted grid, points only (spec: "no solid lines"). Rendered as an SVG pattern
// so it scales with zoom without re-rendering thousands of <circle> nodes.

interface Props {
  widthMm: number;
  heightMm: number;
  gridPitchMm: number;
}

export default function GridBackground({ widthMm, heightMm, gridPitchMm }: Props) {
  const patternId = "schematic-grid-dots";
  return (
    <>
      <defs>
        <pattern
          id={patternId}
          width={gridPitchMm}
          height={gridPitchMm}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={0.5} cy={0.5} r={gridPitchMm * 0.045} fill="#c9c2b4" />
        </pattern>
      </defs>
      {/* paper sheet */}
      <rect x={0} y={0} width={widthMm} height={heightMm} fill="#faf8f3" />
      <rect x={0} y={0} width={widthMm} height={heightMm} fill={`url(#${patternId})`} />
      <rect
        x={0}
        y={0}
        width={widthMm}
        height={heightMm}
        fill="none"
        stroke="#d8d2c2"
        strokeWidth={Math.max(1, gridPitchMm * 0.02)}
      />
    </>
  );
}
