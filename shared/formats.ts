export type MediaKind = "audio" | "video" | "image";
export type Quality = "low" | "medium" | "high";

export interface FormatSpec {
  id: string;
  label: string;
  ext: string;
  kind: MediaKind;
  lossless?: boolean;
}

export const AUDIO_FORMATS: FormatSpec[] = [
  { id: "mp3", label: "MP3", ext: "mp3", kind: "audio" },
  { id: "ogg", label: "OGG", ext: "ogg", kind: "audio" },
  { id: "wav", label: "WAV", ext: "wav", kind: "audio", lossless: true },
  { id: "flac", label: "FLAC", ext: "flac", kind: "audio", lossless: true },
  { id: "m4a", label: "M4A", ext: "m4a", kind: "audio" },
  { id: "aac", label: "AAC", ext: "aac", kind: "audio" },
  { id: "opus", label: "OPUS", ext: "opus", kind: "audio" },
];

export const VIDEO_FORMATS: FormatSpec[] = [
  { id: "mp4", label: "MP4", ext: "mp4", kind: "video" },
  { id: "mov", label: "MOV", ext: "mov", kind: "video" },
  { id: "mkv", label: "MKV", ext: "mkv", kind: "video" },
  { id: "webm", label: "WEBM", ext: "webm", kind: "video" },
  { id: "avi", label: "AVI", ext: "avi", kind: "video" },
  { id: "gif", label: "GIF", ext: "gif", kind: "video" },
];

export const IMAGE_FORMATS: FormatSpec[] = [
  { id: "png", label: "PNG", ext: "png", kind: "image", lossless: true },
  { id: "jpg", label: "JPG", ext: "jpg", kind: "image" },
  { id: "webp", label: "WEBP", ext: "webp", kind: "image" },
  { id: "bmp", label: "BMP", ext: "bmp", kind: "image", lossless: true },
];

export const ALL_FORMATS: FormatSpec[] = [
  ...VIDEO_FORMATS,
  ...AUDIO_FORMATS,
  ...IMAGE_FORMATS,
];

const AUDIO_EXTS = new Set([
  "mp3", "wav", "wave", "ogg", "oga", "opus", "flac", "m4a", "m4b",
  "aac", "wma", "aiff", "aif", "amr", "mka", "ac3",
]);

const VIDEO_EXTS = new Set([
  "mp4", "m4v", "mov", "mkv", "webm", "avi", "wmv", "flv",
  "mpg", "mpeg", "ts", "mts", "m2ts", "3gp", "ogv", "vob",
]);

const IMAGE_EXTS = new Set([
  "png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff", "gif", "avif",
]);

export const MEDIA_EXTENSIONS = Array.from(
  new Set([...AUDIO_EXTS, ...VIDEO_EXTS, ...IMAGE_EXTS]),
).sort();

export function extensionOf(name: string): string {
  const index = name.lastIndexOf(".");
  return index < 0 ? "" : name.slice(index + 1).toLowerCase();
}

export function detectKind(name: string): MediaKind | null {
  const ext = extensionOf(name);
  if (VIDEO_EXTS.has(ext)) return "video";
  if (AUDIO_EXTS.has(ext)) return "audio";
  if (IMAGE_EXTS.has(ext)) return "image";
  return null;
}

export function targetFormats(
  kind: MediaKind | null,
  ext: string,
): FormatSpec[] {
  if (kind === "audio") return AUDIO_FORMATS;
  if (kind === "video") return [...VIDEO_FORMATS, ...AUDIO_FORMATS];
  if (kind === "image") {
    const extras =
      ext === "gif" ? VIDEO_FORMATS.filter((f) => f.id !== "gif") : [];
    return [...IMAGE_FORMATS, ...extras];
  }
  return ALL_FORMATS;
}

export function findFormat(id: string): FormatSpec | undefined {
  return ALL_FORMATS.find((format) => format.id === id);
}
