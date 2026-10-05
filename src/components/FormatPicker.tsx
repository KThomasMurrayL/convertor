import type { FormatSpec, MediaKind } from "../../shared/formats";

interface FormatPickerProps {
  formats: FormatSpec[];
  inputKind: MediaKind | null;
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

const GROUPS: { kind: MediaKind; label: string }[] = [
  { kind: "video", label: "Video" },
  { kind: "audio", label: "Audio" },
  { kind: "image", label: "Image" },
];

export function FormatPicker({
  formats,
  inputKind,
  value,
  onChange,
  disabled,
}: FormatPickerProps) {
  return (
    <div className="format-groups">
      {GROUPS.map(({ kind, label }) => {
        const items = formats.filter((format) => format.kind === kind);
        if (items.length === 0) return null;

        const groupLabel =
          kind === "audio" && inputKind === "video" ? "Audio only" : label;

        return (
          <div className="group" key={kind}>
            <span className="group-label">{groupLabel}</span>
            <div className="pills">
              {items.map((format) => (
                <button
                  key={format.id}
                  type="button"
                  className={`pill${value === format.id ? " active" : ""}`}
                  onClick={() => onChange(format.id)}
                  disabled={disabled}
                >
                  {format.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
