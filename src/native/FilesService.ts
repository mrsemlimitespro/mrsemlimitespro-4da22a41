/**
 * FilesService — leitura/escrita/download de arquivos no sandbox do app.
 *
 * Fase atual: contrato. Implementação usará @capacitor/filesystem.
 */
import { type NativeResult, notImplemented } from "./types";

export type Directory = "documents" | "cache" | "data";

export interface FileWriteOptions {
  path: string;
  data: string; // base64 ou texto
  directory?: Directory;
  encoding?: "utf8" | "base64";
}

export const FilesService = {
  async read(_path: string, _directory?: Directory): Promise<NativeResult<string>> {
    return notImplemented("FilesService.read");
  },
  async write(_opts: FileWriteOptions): Promise<NativeResult<void>> {
    return notImplemented("FilesService.write");
  },
  async remove(_path: string, _directory?: Directory): Promise<NativeResult<void>> {
    return notImplemented("FilesService.remove");
  },
  async downloadToDevice(_url: string, _fileName: string): Promise<NativeResult<string>> {
    return notImplemented("FilesService.downloadToDevice");
  },
};
