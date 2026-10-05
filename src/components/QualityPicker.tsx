import type { Quality } from "../../shared/formats";

interface QualityPickerProps {
  value: Quality;
  onChange: (quality: Quality) => void;
  disabled?: boolean;
}

const OPTIONS: { id: Quality; label: string }[] = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

export function QualityPicker({
  value,
  onChange,
  disabled,
}: QualityPickerProps) {
  return (
    <div className="segmented" role="radiogroup" aria-label="Quality">
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          className={value === option.id ? "active" : ""}
          onClick={() => onChange(option.id)}
          disabled={disabled}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
