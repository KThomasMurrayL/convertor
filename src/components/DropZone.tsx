import {
  useCallback,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import type { FileInfo } from "../../shared/ipc";
import { errorMessage } from "../utils";
import { UploadIcon } from "./icons";

interface DropZoneProps {
  onFile: (file: FileInfo) => void;
  onError: (message: string) => void;
}

export function DropZone({ onFile, onError }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  const browse = useCallback(async () => {
    try {
      const info = await window.api.pickFile();
      if (info) onFile(info);
    } catch (error) {
      onError(errorMessage(error));
    }
  }, [onFile, onError]);

  const handleDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragDepth.current = 0;
      setDragging(false);

      const file = event.dataTransfer.files?.[0];
      if (!file) return;

      try {
        const filePath = window.api.getPathForFile(file);
        if (!filePath) {
          throw new Error("Could not read the dropped file path. Use Browse instead.");
        }
        const info = await window.api.fileInfo(filePath);
        onFile(info);
      } catch (error) {
        onError(errorMessage(error));
      }
    },
    [onFile, onError],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        void browse();
      }
    },
    [browse],
  );

  return (
    <div
      className={`dropzone${dragging ? " dragging" : ""}`}
      role="button"
      tabIndex={0}
      onClick={browse}
      onKeyDown={handleKeyDown}
      onDragEnter={(event) => {
        event.preventDefault();
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        event.preventDefault();
        dragDepth.current -= 1;
        if (dragDepth.current <= 0) {
          dragDepth.current = 0;
          setDragging(false);
        }
      }}
      onDrop={handleDrop}
    >
      <div className="dz-icon">
        <UploadIcon size={38} />
      </div>
      <div className="dz-title">Drop a file here</div>
      <div className="dz-sub">or click to browse — audio, video and images</div>
      <div className="dz-hint">Everything is converted on this device</div>
    </div>
  );
}
