// components/PropertiesPanel/RichTextToolbar.tsx
// Minimal floating toolbar shown while editing inline text (comments, property fields).
// Uses document.execCommand for simplicity — swap for a proper rich-text lib
// (Slate, Lexical, ProseMirror) in a production build.

const FONTS = ["Inter", "JetBrains Mono", "Georgia", "Times New Roman"];
const SIZES = [12, 14, 16, 20, 24, 32];

interface Props {
  onClose: () => void;
}

export default function RichTextToolbar({ onClose }: Props) {
  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
  };

  return (
    <div
      className="absolute -top-11 left-0 z-20 flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2 py-1 shadow-md"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <select
        className="text-xs border border-stone-200 rounded px-1 py-0.5"
        onChange={(e) => exec("fontName", e.target.value)}
        defaultValue={FONTS[0]}
      >
        {FONTS.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
      <select
        className="text-xs border border-stone-200 rounded px-1 py-0.5"
        onChange={(e) => exec("fontSize", e.target.value)}
        defaultValue="3"
      >
        {SIZES.map((s, i) => (
          <option key={s} value={i + 1}>
            {s}px
          </option>
        ))}
      </select>
      <ToolbarButton label="B" onClick={() => exec("bold")} bold />
      <ToolbarButton label="I" onClick={() => exec("italic")} italic />
      <ToolbarButton label="U" onClick={() => exec("underline")} underline />
      <div className="w-px h-4 bg-stone-200 mx-1" />
      <ToolbarButton label="⟸" onClick={() => exec("justifyLeft")} />
      <ToolbarButton label="⟺" onClick={() => exec("justifyCenter")} />
      <ToolbarButton label="⟹" onClick={() => exec("justifyRight")} />
      <div className="w-px h-4 bg-stone-200 mx-1" />
      <button className="text-xs text-stone-400 hover:text-stone-700 px-1" onClick={onClose}>
        Xong
      </button>
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  bold,
  italic,
  underline,
}: {
  label: string;
  onClick: () => void;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}) {
  return (
    <button
      className="w-6 h-6 grid place-items-center text-xs rounded hover:bg-stone-100 text-stone-700"
      style={{
        fontWeight: bold ? 700 : 400,
        fontStyle: italic ? "italic" : "normal",
        textDecoration: underline ? "underline" : "none",
      }}
      onMouseDown={(e) => e.preventDefault()} // keep selection focus on the editable div
      onClick={onClick}
    >
      {label}
    </button>
  );
}
