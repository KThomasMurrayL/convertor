import type {
  ConvertRequest,
  ConvertResult,
  FileInfo,
  ProgressUpdate,
} from "../shared/ipc";

declare global {
  interface Window {
    api: {
      pickFile(): Promise<FileInfo | null>;
      fileInfo(filePath: string): Promise<FileInfo>;
      getPathForFile(file: File): string;
      convert(request: ConvertRequest): Promise<ConvertResult>;
      cancel(): Promise<boolean>;
      showInFolder(filePath: string): Promise<void>;
      onProgress(callback: (update: ProgressUpdate) => void): () => void;
    };
  }
}

export {};
