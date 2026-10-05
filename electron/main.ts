import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  session,
  shell,
  type OpenDialogOptions,
} from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { buildArgs, resolveFfmpegPath } from "./ffmpeg";
import {
  detectKind,
  extensionOf,
  findFormat,
  MEDIA_EXTENSIONS,
  type Quality,
} from "../shared/formats";
import type { ConvertRequest, ConvertResult, FileInfo } from "../shared/ipc";

const devServerUrl = process.env.VITE_DEV_SERVER_URL;

interface ActiveJob {
  child: ChildProcess;
  cancelled: boolean;
  stderrTail: string[];
}

let activeJob: ActiveJob | null = null;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 920,
    height: 780,
    minWidth: 620,
    minHeight: 540,
    title: "Convertor",
    backgroundColor: "#0e1014",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once("ready-to-show", () => win.show());
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event) => event.preventDefault());
  win.on("closed", () => {
    if (activeJob) {
      activeJob.cancelled = true;
      activeJob.child.kill("SIGKILL");
      activeJob = null;
    }
  });

  if (devServerUrl) {
    void win.loadURL(devServerUrl);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    void win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  return win;
}

function fileInfoOf(filePath: string): FileInfo {
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    throw new Error("The selected item is not a file.");
  }
  const name = path.basename(filePath);
  return {
    path: filePath,
    name,
    size: stat.size,
    ext: extensionOf(name),
    kind: detectKind(name),
  };
}

function uniqueOutputPath(input: string, ext: string): string {
  const dir = path.dirname(input);
  const base = path.basename(input, path.extname(input));
  let candidate = path.join(dir, `${base}.${ext}`);
  let counter = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${base} (${counter}).${ext}`);
    counter += 1;
  }
  return candidate;
}

function parseTime(value: string): number | null {
  const match = value.match(/^(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/);
  if (!match) return null;
  return (
    Number(match[1]) * 3600 + Number(match[2]) * 60 + parseFloat(match[3])
  );
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function registerIpc(): void {
  ipcMain.handle("dialog:pick-file", async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const options: OpenDialogOptions = {
      title: "Choose a media file",
      properties: ["openFile"],
      filters: [
        { name: "Media files", extensions: MEDIA_EXTENSIONS },
        { name: "All files", extensions: ["*"] },
      ],
    };
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options);
    if (result.canceled || result.filePaths.length === 0) return null;
    return fileInfoOf(result.filePaths[0]);
  });

  ipcMain.handle("file:info", (_event, filePath: unknown) => {
    if (typeof filePath !== "string" || filePath.length === 0) {
      throw new Error("Invalid file path.");
    }
    return fileInfoOf(filePath);
  });

  ipcMain.handle("shell:show-item", (_event, filePath: unknown) => {
    if (typeof filePath === "string" && filePath.length > 0) {
      shell.showItemInFolder(filePath);
    }
  });

  ipcMain.handle("convert:cancel", () => {
    if (!activeJob) return false;
    activeJob.cancelled = true;
    activeJob.child.kill("SIGKILL");
    return true;
  });

  ipcMain.handle(
    "convert",
    async (event, raw: unknown): Promise<ConvertResult> => {
      if (activeJob) {
        return { ok: false, error: "A conversion is already running." };
      }
      if (!raw || typeof raw !== "object") {
        return { ok: false, error: "Invalid request." };
      }

      const request = raw as Partial<ConvertRequest>;
      if (
        typeof request.inputPath !== "string" ||
        typeof request.formatId !== "string"
      ) {
        return { ok: false, error: "Invalid request." };
      }

      const quality: Quality =
        request.quality === "low" || request.quality === "high"
          ? request.quality
          : "medium";

      const format = findFormat(request.formatId);
      if (!format) {
        return { ok: false, error: "Unsupported output format." };
      }

      try {
        const stat = fs.statSync(request.inputPath);
        if (!stat.isFile()) {
          return { ok: false, error: "Input is not a file." };
        }
      } catch {
        return { ok: false, error: "Input file not found." };
      }

      const inputPath = request.inputPath;
      const outputPath = uniqueOutputPath(inputPath, format.ext);
      const args = buildArgs(inputPath, outputPath, format, quality);
      const binary = await resolveFfmpegPath();

      return await new Promise<ConvertResult>((resolve) => {
        let child: ChildProcess;
        try {
          child = spawn(binary, args, {
            windowsHide: true,
            stdio: ["ignore", "pipe", "pipe"],
          });
        } catch (error) {
          resolve({ ok: false, error: errorText(error) });
          return;
        }

        const job: ActiveJob = { child, cancelled: false, stderrTail: [] };
        activeJob = job;

        let duration = 0;
        let stdoutBuffer = "";
        let stderrBuffer = "";

        const sendProgress = (percent: number | null) => {
          if (event.sender.isDestroyed()) return;
          event.sender.send("conversion:progress", { percent });
        };

        child.stdout?.on("data", (chunk: Buffer) => {
          stdoutBuffer += chunk.toString();
          let index = stdoutBuffer.indexOf("\n");
          while (index >= 0) {
            const line = stdoutBuffer.slice(0, index).trim();
            stdoutBuffer = stdoutBuffer.slice(index + 1);
            index = stdoutBuffer.indexOf("\n");
            if (!line) continue;

            if (line.startsWith("out_time=")) {
              const seconds = parseTime(line.slice("out_time=".length));
              if (seconds !== null && duration > 0) {
                sendProgress(
                  Math.max(0, Math.min(100, (seconds / duration) * 100)),
                );
              }
            } else if (line.startsWith("progress=end")) {
              sendProgress(100);
            }
          }
        });

        child.stderr?.on("data", (chunk: Buffer) => {
          stderrBuffer += chunk.toString();
          let index = stderrBuffer.indexOf("\n");
          while (index >= 0) {
            const line = stderrBuffer.slice(0, index).trim();
            stderrBuffer = stderrBuffer.slice(index + 1);
            index = stderrBuffer.indexOf("\n");
            if (!line) continue;

            if (duration === 0) {
              const match = line.match(
                /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/,
              );
              if (match) {
                duration =
                  Number(match[1]) * 3600 +
                  Number(match[2]) * 60 +
                  parseFloat(match[3]);
              }
            }

            job.stderrTail.push(line);
            if (job.stderrTail.length > 20) job.stderrTail.shift();
          }
        });

        child.on("error", (error) => {
          if (activeJob === job) activeJob = null;
          const message = error.message.includes("ENOENT")
            ? "ffmpeg executable was not found. Install ffmpeg or reinstall the app dependencies."
            : error.message;
          resolve({ ok: false, error: message });
        });

        child.on("close", (code) => {
          if (activeJob === job) activeJob = null;

          if (job.cancelled) {
            resolve({ ok: false, cancelled: true, error: "Conversion cancelled." });
            return;
          }

          if (code === 0) {
            resolve({ ok: true, outputPath });
            return;
          }

          const detail =
            job.stderrTail.slice(-6).join("\n") ||
            `ffmpeg exited with code ${code}`;
          resolve({ ok: false, error: detail });
        });
      });
    },
  );
}

function applyCsp(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'",
        ],
      },
    });
  });
}

app
  .whenReady()
  .then(() => {
    if (process.platform !== "darwin") {
      Menu.setApplicationMenu(null);
    }
    if (!devServerUrl) {
      applyCsp();
    }
    registerIpc();
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  })
  .catch((error) => {
    console.error(error);
    app.quit();
  });

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
