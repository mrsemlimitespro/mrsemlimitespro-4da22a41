/**
 * CameraService — captura por câmera e seleção da galeria.
 *
 * Regras da arquitetura:
 *   - Nenhum componente React importa `@capacitor/camera` diretamente.
 *   - Todos os métodos retornam `NativeResult<T>` (sem throw).
 *   - Plugin nativo carregado via `await import()`.
 *   - Web/PWA: fallback com `<input type="file">` (foto ou galeria).
 *   - Cancelamento é tratado como `code: "cancelled"` — não é erro.
 *
 * Segurança:
 *   - `saveToGallery` default: `false` — não persiste no rolo do usuário
 *     sem intenção explícita.
 *   - O caller decide quando revogar `ObjectURL`s (via `revokeBlob`).
 */
import { getPlatform, isNative } from "@/lib/platform";
import { fail, ok, type NativeResult } from "./types";

export type CameraSource = "camera" | "gallery" | "prompt";
export type PhotoFormat = "jpeg" | "png" | "webp";

export interface CameraOptions {
  /** camera | gallery | prompt (deixa o usuário escolher). Default: `prompt`. */
  source?: CameraSource;
  /** 0..100 — só afeta JPEG/WEBP. Default: 82. */
  quality?: number;
  /** Editor nativo do sistema. Default: false. */
  allowEditing?: boolean;
  /** Salva a foto capturada na galeria do dispositivo. Default: false. */
  saveToGallery?: boolean;
  /** Redimensiona para caber em um retângulo NxN (px). */
  maxWidth?: number;
  maxHeight?: number;
  /** Formato preferido de saída. Default: jpeg. */
  preferredFormat?: PhotoFormat;
}

export interface CameraPhoto {
  /** `blob:` URL sempre disponível para uso imediato em <img>. */
  path: string;
  /** Blob real do arquivo (fonte de verdade — use para upload). */
  blob: Blob;
  format: PhotoFormat;
  size: number;
  width?: number;
  height?: number;
  /** Nome sugerido de arquivo (ex.: "photo-2025-06-12.jpg"). */
  fileName: string;
}

export interface PickMultipleOptions extends Omit<CameraOptions, "source"> {
  /** Máximo de imagens a selecionar (quando a plataforma suportar). */
  limit?: number;
}

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function mimeFor(format: PhotoFormat): string {
  return format === "png" ? "image/png" : format === "webp" ? "image/webp" : "image/jpeg";
}

function extFor(format: PhotoFormat): string {
  return format === "png" ? "png" : format === "webp" ? "webp" : "jpg";
}

function suggestedFileName(format: PhotoFormat): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `photo-${stamp}.${extFor(format)}`;
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}

async function fileToPhoto(file: File, preferred: PhotoFormat): Promise<CameraPhoto> {
  const format: PhotoFormat =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpeg";
  const finalFormat: PhotoFormat = preferred ?? format;
  const url = URL.createObjectURL(file);
  return {
    path: url,
    blob: file,
    format: finalFormat,
    size: file.size,
    fileName: file.name || suggestedFileName(finalFormat),
  };
}

/** Abre um `<input type="file">` invisível e resolve com os arquivos. */
function openFileDialog(
  accept: string,
  multiple: boolean,
  captureCamera: boolean,
): Promise<File[]> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve([]);
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = multiple;
    if (captureCamera) input.setAttribute("capture", "environment");
    input.style.display = "none";
    let settled = false;
    const finish = (files: File[]) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(files);
    };
    input.addEventListener("change", () => {
      const files = Array.from(input.files ?? []);
      finish(files);
    });
    // Detecta cancelamento: alguns browsers disparam "cancel"; outros
    // apenas retornam sem change. Timeout de foco resolve o resto.
    input.addEventListener("cancel", () => finish([]));
    document.body.appendChild(input);
    input.click();
    // Fallback via window focus: se após 90s não houve change, considera vazio.
    const onFocus = () => {
      setTimeout(() => {
        if (!settled && input.files && input.files.length === 0) finish([]);
        window.removeEventListener("focus", onFocus);
      }, 300);
    };
    window.addEventListener("focus", onFocus, { once: true });
  });
}

// ────────────────────────────────────────────────────────────────
// Nativo (Capacitor)
// ────────────────────────────────────────────────────────────────

type CapCamera = typeof import("@capacitor/camera");

async function loadCameraPlugin(): Promise<CapCamera> {
  return await import("@capacitor/camera");
}

function mapNativeSource(source: CameraSource | undefined, plugin: CapCamera) {
  const S = plugin.CameraSource;
  switch (source) {
    case "camera":
      return S.Camera;
    case "gallery":
      return S.Photos;
    default:
      return S.Prompt;
  }
}

async function nativeTake(
  opts: CameraOptions | undefined,
  source: CameraSource,
): Promise<NativeResult<CameraPhoto>> {
  try {
    const plugin = await loadCameraPlugin();
    const { Camera, CameraResultType } = plugin;

    // Confere permissão antes — trata "denied" separadamente do usuário
    // cancelar o diálogo do sistema.
    const perms = await Camera.checkPermissions();
    const needed = source === "camera" ? perms.camera : perms.photos;
    if (needed === "denied") {
      return fail("permission_denied", "Permissão para acessar câmera/galeria foi negada.");
    }
    if (needed !== "granted") {
      const asked = await Camera.requestPermissions({
        permissions: [source === "camera" ? "camera" : "photos"],
      });
      const now = source === "camera" ? asked.camera : asked.photos;
      if (now !== "granted") {
        return fail("permission_denied", "Permissão para acessar câmera/galeria não concedida.");
      }
    }

    const preferred = opts?.preferredFormat ?? "jpeg";
    const result = await Camera.getPhoto({
      quality: opts?.quality ?? 82,
      allowEditing: opts?.allowEditing ?? false,
      resultType: CameraResultType.DataUrl,
      source: mapNativeSource(source, plugin),
      saveToGallery: opts?.saveToGallery ?? false,
      width: opts?.maxWidth,
      height: opts?.maxHeight,
    });

    const dataUrl = result.dataUrl ?? "";
    if (!dataUrl) return fail("unknown", "Retorno vazio da câmera.");
    const blob = await dataUrlToBlob(dataUrl);
    const format: PhotoFormat =
      (result.format as PhotoFormat) === "png" || (result.format as PhotoFormat) === "webp"
        ? (result.format as PhotoFormat)
        : preferred;
    return ok<CameraPhoto>({
      path: URL.createObjectURL(blob),
      blob,
      format,
      size: blob.size,
      fileName: suggestedFileName(format),
    });
  } catch (cause) {
    const message = (cause as { message?: string })?.message ?? "";
    // Plugin sinaliza cancelamento com essas mensagens em Android/iOS
    if (/cancel/i.test(message) || /user cancelled/i.test(message)) {
      return fail("cancelled", "Ação cancelada pelo usuário.", cause);
    }
    return fail("unknown", message || "Falha ao capturar imagem.", cause);
  }
}

// ────────────────────────────────────────────────────────────────
// Web (fallback)
// ────────────────────────────────────────────────────────────────

async function webPick(
  source: CameraSource,
  opts?: CameraOptions,
): Promise<NativeResult<CameraPhoto>> {
  const accept = "image/jpeg,image/png,image/webp,image/*";
  const files = await openFileDialog(accept, false, source === "camera");
  if (files.length === 0) return fail("cancelled", "Nenhuma imagem selecionada.");
  const file = files[0];
  return ok(await fileToPhoto(file, opts?.preferredFormat ?? "jpeg"));
}

async function webPickMultiple(opts?: PickMultipleOptions): Promise<NativeResult<CameraPhoto[]>> {
  const accept = "image/jpeg,image/png,image/webp,image/*";
  const files = await openFileDialog(accept, true, false);
  if (files.length === 0) return fail("cancelled", "Nenhuma imagem selecionada.");
  const limit = opts?.limit ?? files.length;
  const selected = files.slice(0, limit);
  const photos = await Promise.all(
    selected.map((f) => fileToPhoto(f, opts?.preferredFormat ?? "jpeg")),
  );
  return ok(photos);
}

// ────────────────────────────────────────────────────────────────
// API pública
// ────────────────────────────────────────────────────────────────

export const CameraService = {
  /** Fluxo unificado — o `source` escolhe (default: camera). */
  async takePhoto(opts?: CameraOptions): Promise<NativeResult<CameraPhoto>> {
    const source: CameraSource = opts?.source ?? "camera";
    if (isNative()) return nativeTake(opts, source);
    return webPick(source, opts);
  },

  async pickFromGallery(opts?: CameraOptions): Promise<NativeResult<CameraPhoto>> {
    if (isNative()) return nativeTake(opts, "gallery");
    return webPick("gallery", opts);
  },

  /**
   * Múltiplas imagens. Nativo: usa `Camera.pickImages` (iOS 14+ / Android moderno).
   * Web/PWA: usa `<input type="file" multiple>`.
   */
  async pickMultiple(opts?: PickMultipleOptions): Promise<NativeResult<CameraPhoto[]>> {
    if (!isNative()) return webPickMultiple(opts);
    try {
      const { Camera } = await loadCameraPlugin();
      const perms = await Camera.checkPermissions();
      if (perms.photos !== "granted") {
        const asked = await Camera.requestPermissions({ permissions: ["photos"] });
        if (asked.photos !== "granted") {
          return fail("permission_denied", "Permissão de galeria não concedida.");
        }
      }
      const result = await Camera.pickImages({
        quality: opts?.quality ?? 82,
        limit: opts?.limit ?? 0,
        width: opts?.maxWidth,
        height: opts?.maxHeight,
      });
      const preferred = opts?.preferredFormat ?? "jpeg";
      const photos: CameraPhoto[] = [];
      for (const p of result.photos ?? []) {
        const src = p.webPath ?? p.path ?? "";
        if (!src) continue;
        const resp = await fetch(src);
        const blob = await resp.blob();
        const format: PhotoFormat =
          (p.format as PhotoFormat) === "png" || (p.format as PhotoFormat) === "webp"
            ? (p.format as PhotoFormat)
            : preferred;
        photos.push({
          path: URL.createObjectURL(blob),
          blob,
          format,
          size: blob.size,
          fileName: suggestedFileName(format),
        });
      }
      if (photos.length === 0) return fail("cancelled", "Nenhuma imagem selecionada.");
      return ok(photos);
    } catch (cause) {
      const message = (cause as { message?: string })?.message ?? "";
      if (/cancel/i.test(message)) return fail("cancelled", message, cause);
      return fail("unknown", message || "Falha ao selecionar imagens.", cause);
    }
  },

  /**
   * Confere permissão sem solicitar. `kind`: "camera" | "photos".
   */
  async checkPermission(
    kind: "camera" | "photos",
  ): Promise<NativeResult<"granted" | "denied" | "prompt" | "limited">> {
    if (!isNative()) {
      // Web: navigator.permissions cobre camera; photos não existe (uso é via input file).
      if (kind === "photos") return ok("granted");
      try {
        const s = await navigator.permissions?.query({ name: "camera" as PermissionName });
        return ok((s?.state ?? "prompt") as "granted" | "denied" | "prompt");
      } catch {
        return ok("prompt");
      }
    }
    try {
      const { Camera } = await loadCameraPlugin();
      const r = await Camera.checkPermissions();
      return ok(
        (kind === "camera" ? r.camera : r.photos) as "granted" | "denied" | "prompt" | "limited",
      );
    } catch (cause) {
      return fail("not_available", "Falha ao checar permissão de câmera.", cause);
    }
  },

  async requestPermission(
    kind: "camera" | "photos",
  ): Promise<NativeResult<"granted" | "denied" | "prompt" | "limited">> {
    if (!isNative()) return this.checkPermission(kind);
    try {
      const { Camera } = await loadCameraPlugin();
      const r = await Camera.requestPermissions({ permissions: [kind] });
      return ok(
        (kind === "camera" ? r.camera : r.photos) as "granted" | "denied" | "prompt" | "limited",
      );
    } catch (cause) {
      return fail("not_available", "Falha ao solicitar permissão de câmera.", cause);
    }
  },

  /** Utilidade: libera memória de um blob:URL criado pelo serviço. */
  revokeBlob(url: string): void {
    if (typeof url === "string" && url.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* noop */
      }
    }
  },

  /** Info da plataforma para o consumidor decidir botão único vs prompt. */
  get platform() {
    return getPlatform();
  },
};
