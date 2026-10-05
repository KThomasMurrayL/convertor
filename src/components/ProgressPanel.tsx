interface ProgressPanelProps {
  percent: number | null;
  onCancel: () => void;
}

export function ProgressPanel({ percent, onCancel }: ProgressPanelProps) {
  const known = percent !== null;
  const clamped = known ? Math.min(100, Math.max(0, percent)) : 0;

  return (
    <section className="panel progress">
      <div className="progress-row">
        <span>{known ? "Converting…" : "Preparing conversion…"}</span>
        <span className="progress-percent">{known ? `${Math.round(clamped)}%` : ""}</span>
      </div>
      <div className={`bar${known ? "" : " indeterminate"}`}>
        <div
          className="fill"
          style={known ? { width: `${clamped}%` } : undefined}
        />
      </div>
      <div className="progress-row">
        <span className="hint">Large files may take a while.</span>
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}
