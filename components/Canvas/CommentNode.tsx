// components/Canvas/CommentNode.tsx
import { useRef, useState } from "react";
import { CommentInstance } from "../../lib/types";
import RichTextToolbar from "../PropertiesPanel/RichTextToolbar";

interface Props {
  comment: CommentInstance;
  selected: boolean;
  hovered: boolean;
  mmToPx: number;
  onSelect: (id: string, additive: boolean) => void;
  onHover: (id: string | null) => void;
  onChange: (id: string, patch: Partial<CommentInstance>) => void;
  onPointerDownBody: (e: React.PointerEvent) => void;
}

export default function CommentNode({
  comment,
  selected,
  hovered,
  mmToPx,
  onSelect,
  onHover,
  onChange,
  onPointerDownBody,
}: Props) {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <foreignObject
      x={comment.x - 400}
      y={comment.y - 20}
      width={800}
      height={200}
      style={{ overflow: "visible", pointerEvents: "none" }}
    >
      <div
        style={{
          pointerEvents: "auto",
          display: "flex",
          justifyContent:
            comment.align === "center" ? "center" : comment.align === "right" ? "flex-end" : "flex-start",
        }}
      >
        <div style={{ position: "relative" }}>
          {editing && <RichTextToolbar onClose={() => setEditing(false)} />}
          <div
            ref={ref}
            contentEditable={editing}
            suppressContentEditableWarning
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelect(comment.id, e.shiftKey);
              if (!editing) onPointerDownBody(e as any);
            }}
            onPointerEnter={() => onHover(comment.id)}
            onPointerLeave={() => onHover(null)}
            onDoubleClick={() => setEditing(true)}
            onBlur={() => {
              setEditing(false);
              if (ref.current) onChange(comment.id, { html: ref.current.innerHTML });
            }}
            style={{
              fontSize: comment.fontSize,
              fontWeight: comment.bold ? 700 : 400,
              textAlign: comment.align,
              color: "#242320",
              background: "transparent",
              border: selected ? "1px dashed #c0392b" : hovered ? "1px dashed #2563eb" : "1px dashed transparent",
              padding: 2,
              cursor: editing ? "text" : "move",
              outline: "none",
              whiteSpace: "pre-wrap",
              minWidth: 40,
            }}
            dangerouslySetInnerHTML={{ __html: comment.html }}
          />
        </div>
      </div>
    </foreignObject>
  );
}
