import type { FileInfo } from "../../shared/ipc";
import { formatBytes } from "../utils";
import { FileIcon, FilmIcon, ImageIcon, MusicIcon } from "./icons";

const KIND_LABEL: Record<string, string> = {
  audio: "Audio",
  video: "Video",
  image: "Image",
};

interface FileCardProps {
  file: FileInfo;
  onReplace: () => void;
  onRemove: () => void;
}

export function FileCard({ file, onReplace, onRemove }: FileCardProps) {
  const Icon =
    file.kind === "audio"
      ? MusicIcon
      : file.kind === "video"
        ? FilmIcon
        : file.kind === "image"
          ? ImageIcon
          : FileIcon;

  return (
    <div className="file-card">
      <div className="file-icon">
        <Icon size={20} />
      </div>
      <div className="file-meta">
        <div className="file-name" title={file.name}>
          {file.name}
        </div>
        <div className="file-sub">
          {file.kind && <span className="badge">{KIND_LABEL[file.kind]}</span>}
          {file.ext && <span className="badge">{file.ext}</span>}
          <span>{formatBytes(file.size)}</span>
        </div>
      </div>
      <div className="file-actions">
        <button type="button" className="ghost" onClick={onReplace}>
          Replace
        </button>
        <button type="button" className="ghost" onClick={onRemove}>
          Remove
        </button>
      </div>
    </div>
  );
}
