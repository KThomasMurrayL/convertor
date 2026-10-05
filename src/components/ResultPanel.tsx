import { CheckIcon } from "./icons";

interface ResultPanelProps {
  outputPath: string;
  onShow: () => void;
  onBack: () => void;
  onAnother: () => void;
}

export function ResultPanel({
  outputPath,
  onShow,
  onBack,
  onAnother,
}: ResultPanelProps) {
  const name = outputPath.split(/[\\/]/).pop() ?? outputPath;

  return (
    <section className="result">
      <div className="result-icon">
        <CheckIcon size={26} />
      </div>
      <h2>Conversion complete</h2>
      <div className="result-file">
        <div className="file-name">{name}</div>
        <div className="path">{outputPath}</div>
      </div>
      <div className="result-actions">
        <button type="button" className="primary fit" onClick={onShow}>
          Show in folder
        </button>
        <button type="button" className="ghost" onClick={onBack}>
          Try another format
        </button>
        <button type="button" className="ghost" onClick={onAnother}>
          New file
        </button>
      </div>
    </section>
  );
}
