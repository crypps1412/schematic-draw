// components/PropertiesPanel/WireProperties.tsx
import { WireInstance } from "../../lib/types";
import { useEditorStore, getBlock, getPin } from "../../store/editorStore";

export default function WireProperties({ wire }: { wire: WireInstance }) {
  const doc = useEditorStore((s) => s.doc);
  const updateWireColor = useEditorStore((s) => s.updateWireColor);

  const fromBlock = getBlock(doc, wire.from.blockId);
  const toBlock = getBlock(doc, wire.to.blockId);
  const fromPin = fromBlock && getPin(fromBlock, wire.from.pinId);
  const toPin = toBlock && getPin(toBlock, wire.to.pinId);

  return (
    <div className="flex flex-col gap-4 p-4 text-stone-800">
      <div>
        <label className="text-[11px] text-stone-500">Màu dây</label>
        <select
          className="w-full mt-1 border border-stone-300 rounded px-2 py-1.5 text-sm bg-white"
          value={wire.colorId}
          onChange={(e) => updateWireColor(wire.id, e.target.value)}
        >
          {doc.wireColors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <EndpointField label="Điểm đầu" blockName={fromBlock?.name} pinEdge={fromPin?.edge} />
      <EndpointField label="Điểm cuối" blockName={toBlock?.name} pinEdge={toPin?.edge} />

      <div className="text-[11px] text-stone-400">
        Đường đi gồm {wire.path.length} điểm neo, chỉ đi ngang/dọc theo lưới.
      </div>
    </div>
  );
}

function EndpointField({
  label,
  blockName,
  pinEdge,
}: {
  label: string;
  blockName?: string;
  pinEdge?: string;
}) {
  return (
    <div>
      <label className="text-[11px] text-stone-500">{label}</label>
      <div className="mt-1 border border-stone-200 rounded px-2 py-1.5 text-sm bg-stone-50 text-stone-600">
        {blockName ?? "—"} {pinEdge ? `· cạnh ${pinEdge}` : ""}
      </div>
    </div>
  );
}
