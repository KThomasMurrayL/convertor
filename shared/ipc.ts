import type { MediaKind, Quality } from "./formats";

export interface FileInfo {
  path: string;
  name: string;
  size: number;
  ext: string;
  kind: MediaKind | null;
}

export interface ConvertRequest {
  inputPath: string;
  formatId: string;
  quality: Quality;
}

export type ConvertResult =
  | { ok: true; outputPath: string }
  | { ok: false; error: string; cancelled?: boolean };

export interface ProgressUpdate {
  percent: number | null;
}
