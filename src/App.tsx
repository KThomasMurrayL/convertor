import { useCallback, useEffect, useState } from "react";
import { findFormat, targetFormats, type Quality } from "../shared/formats";
import type { FileInfo } from "../shared/ipc";
import { DropZone } from "./components/DropZone";
import { FileCard } from "./components/FileCard";
import { FormatPicker } from "./components/FormatPicker";
import { ProgressPanel } from "./components/ProgressPanel";
import { QualityPicker } from "./components/QualityPicker";
import { ResultPanel } from "./components/ResultPanel";
import { SwapIcon } from "./components/icons";
import { errorMessage } from "./utils";

type Phase = "empty" | "ready" | "converting" | "done";

export default function App() {
  const [file, setFile] = useState<FileInfo | null>(null);
  const [formatId, setFormatId] = useState("");
  const [quality, setQuality] = useState<Quality>("medium");
  const [phase, setPhase] = useState<Phase>("empty");
  const [percent, setPercent] = useState<number | null>(null);
  const [outputPath, setOutputPath] = useState("");
  const [error, setError] = useState("");

  useEffect(
    () => window.api.onProgress((update) => setPercent(update.percent)),
    [],
  );

  const acceptFile = useCallback((info: FileInfo) => {
    setFile(info);
    setError("");
    setOutputPath("");
    setPercent(null);
    setPhase("ready");

    const targets = targetFormats(info.kind, info.ext);
    const preferred = targets.find((item) => item.ext !== info.ext) ?? targets[0];
    setFormatId(preferred?.id ?? "");
  }, []);

  const replaceFile = useCallback(async () => {
    try {
      const info = await window.api.pickFile();
      if (info) acceptFile(info);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [acceptFile]);

  const removeFile = useCallback(() => {
    setFile(null);
    setFormatId("");
    setPhase("empty");
    setError("");
    setPercent(null);
    setOutputPath("");
  }, []);

  const convert = useCallback(async () => {
    if (!file || !formatId) return;
    setError("");
    setPercent(null);
    setPhase("converting");

    const result = await window.api.convert({
      inputPath: file.path,
      formatId,
      quality,
    });

    if (result.ok) {
      setOutputPath(result.outputPath);
      setPercent(100);
      setPhase("done");
    } else if (result.cancelled) {
      setPercent(null);
      setPhase("ready");
    } else {
      setError(result.error);
      setPercent(null);
      setPhase("ready");
    }
  }, [file, formatId, quality]);

  const cancel = useCallback(() => {
    void window.api.cancel();
  }, []);

  const showInFolder = useCallback(() => {
    if (outputPath) void window.api.showInFolder(outputPath);
  }, [outputPath]);

  const format = findFormat(formatId);
  const converting = phase === "converting";
  const outputName =
    file && format
      ? `${file.name.replace(/\.[^.]+$/, "")}.${format.ext}`
      : "";

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <SwapIcon size={18} />
        </div>
        <div>
          <h1>Convertor</h1>
          <p>Audio, video and image conversion — fully offline</p>
        </div>
      </header>

      {phase === "done" ? (
        <ResultPanel
          outputPath={outputPath}
          onShow={showInFolder}
          onBack={() => setPhase("ready")}
          onAnother={removeFile}
        />
      ) : (
        <>
          {!file ? (
            <DropZone onFile={acceptFile} onError={setError} />
          ) : (
            <>
              <FileCard
                file={file}
                onReplace={replaceFile}
                onRemove={removeFile}
              />

              {format && (
                <section className="panel">
                  <h2>Output format</h2>
                  <FormatPicker
                    formats={targetFormats(file.kind, file.ext)}
                    inputKind={file.kind}
                    value={formatId}
                    onChange={setFormatId}
                    disabled={converting}
                  />

                  {format.lossless ? (
                    <p className="hint">
                      Lossless format — quality presets do not apply.
                    </p>
                  ) : (
                    <div className="quality-row">
                      <span className="group-label">Quality</span>
                      <QualityPicker
                        value={quality}
                        onChange={setQuality}
                        disabled={converting}
                      />
                    </div>
                  )}

                  {format.id === "gif" && (
                    <p className="hint">GIF exports video only, without audio.</p>
                  )}

                  <p className="hint">
                    Saves as <span className="mono">{outputName}</span> next to
                    the original file.
                  </p>
                </section>
              )}

              {converting ? (
                <ProgressPanel percent={percent} onCancel={cancel} />
              ) : (
                <button
                  type="button"
                  className="primary"
                  onClick={convert}
                  disabled={!formatId}
                >
                  Convert to {format?.label ?? "…"}
                </button>
              )}
            </>
          )}

          {error && <div className="banner error">{error}</div>}
        </>
      )}

      <footer className="footer">
        Runs entirely on your device — files never leave this computer.
      </footer>
    </div>
  );
}
