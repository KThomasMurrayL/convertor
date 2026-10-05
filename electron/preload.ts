import { contextBridge, ipcRenderer, webUtils } from "electron";
import type {
  ConvertRequest,
  ConvertResult,
  FileInfo,
  ProgressUpdate,
} from "../shared/ipc";

const api = {
  pickFile: (): Promise<FileInfo | null> =>
    ipcRenderer.invoke("dialog:pick-file"),

  fileInfo: (filePath: string): Promise<FileInfo> =>
    ipcRenderer.invoke("file:info", filePath),

  getPathForFile: (file: File): string => webUtils.getPathForFile(file),

  convert: (request: ConvertRequest): Promise<ConvertResult> =>
    ipcRenderer.invoke("convert", request),

  cancel: (): Promise<boolean> => ipcRenderer.invoke("convert:cancel"),

  showInFolder: (filePath: string): Promise<void> =>
    ipcRenderer.invoke("shell:show-item", filePath),

  onProgress: (callback: (update: ProgressUpdate) => void): (() => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      update: ProgressUpdate,
    ) => callback(update);
    ipcRenderer.on("conversion:progress", listener);
    return () => {
      ipcRenderer.removeListener("conversion:progress", listener);
    };
  },
};

contextBridge.exposeInMainWorld("api", api);
