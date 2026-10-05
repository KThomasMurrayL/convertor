import fs from "node:fs";
import type { FormatSpec, Quality } from "../shared/formats";

const AUDIO_BITRATE: Record<Quality, string> = {
  low: "128k",
  medium: "192k",
  high: "256k",
};

const OPUS_BITRATE: Record<Quality, string> = {
  low: "96k",
  medium: "128k",
  high: "192k",
};

const CRF: Record<Quality, string> = { low: "28", medium: "23", high: "18" };
const VP9_CRF: Record<Quality, string> = { low: "40", medium: "32", high: "24" };
const AVI_Q: Record<Quality, string> = { low: "8", medium: "5", high: "3" };
const JPG_Q: Record<Quality, string> = { low: "7", medium: "4", high: "2" };
const WEBP_Q: Record<Quality, string> = { low: "65", medium: "80", high: "90" };

const GIF: Record<Quality, { fps: number; width: number }> = {
  low: { fps: 10, width: 320 },
  medium: { fps: 12, width: 480 },
  high: { fps: 15, width: 720 },
};

let ffmpegPathCache: string | null = null;

export async function resolveFfmpegPath(): Promise<string> {
  if (ffmpegPathCache) return ffmpegPathCache;

  try {
    const module = await import("ffmpeg-static");
    const candidate = (module.default ?? module) as unknown;
    if (typeof candidate === "string" && candidate.length > 0) {
      const unpacked = candidate.replace("app.asar", "app.asar.unpacked");
      if (fs.existsSync(unpacked)) {
        ffmpegPathCache = unpacked;
        return unpacked;
      }
      if (fs.existsSync(candidate)) {
        ffmpegPathCache = candidate;
        return candidate;
      }
    }
  } catch {
    // No bundled binary for this platform, fall back to system ffmpeg.
  }

  ffmpegPathCache = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  return ffmpegPathCache;
}

export function buildArgs(
  input: string,
  output: string,
  format: FormatSpec,
  quality: Quality,
): string[] {
  return [
    "-hide_banner",
    "-nostdin",
    "-nostats",
    "-y",
    "-progress",
    "pipe:1",
    "-i",
    input,
    ...codecArgs(format, quality),
    output,
  ];
}

function codecArgs(format: FormatSpec, quality: Quality): string[] {
  const audioBitrate = AUDIO_BITRATE[quality];

  switch (format.id) {
    case "mp3":
      return ["-vn", "-c:a", "libmp3lame", "-b:a", audioBitrate];
    case "ogg":
      return ["-vn", "-c:a", "libvorbis", "-b:a", audioBitrate];
    case "wav":
      return ["-vn", "-c:a", "pcm_s16le"];
    case "flac":
      return ["-vn", "-c:a", "flac"];
    case "m4a":
      return ["-vn", "-c:a", "aac", "-b:a", audioBitrate];
    case "aac":
      return ["-vn", "-c:a", "aac", "-b:a", audioBitrate, "-f", "adts"];
    case "opus":
      return ["-vn", "-c:a", "libopus", "-b:a", OPUS_BITRATE[quality]];
    case "mp4":
      return [
        ...x264(quality),
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
      ];
    case "mov":
      return [...x264(quality), "-c:a", "aac", "-b:a", "192k"];
    case "mkv":
      return [...x264(quality), "-c:a", "aac", "-b:a", "192k"];
    case "webm":
      return [
        "-c:v", "libvpx-vp9",
        "-crf", VP9_CRF[quality],
        "-b:v", "0",
        "-row-mt", "1",
        "-c:a", "libopus",
        "-b:a", "128k",
      ];
    case "avi":
      return [
        "-c:v", "mpeg4",
        "-q:v", AVI_Q[quality],
        "-c:a", "libmp3lame",
        "-b:a", "192k",
      ];
    case "gif": {
      const gif = GIF[quality];
      return [
        "-an",
        "-vf",
        `fps=${gif.fps},scale=${gif.width}:-2:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
        "-loop", "0",
      ];
    }
    case "png":
      return ["-frames:v", "1"];
    case "jpg":
      return ["-frames:v", "1", "-q:v", JPG_Q[quality]];
    case "webp":
      return [
        "-frames:v", "1",
        "-c:v", "libwebp",
        "-quality", WEBP_Q[quality],
      ];
    case "bmp":
      return ["-frames:v", "1"];
    default:
      return [];
  }
}

function x264(quality: Quality): string[] {
  return [
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", CRF[quality],
    "-pix_fmt", "yuv420p",
  ];
}
