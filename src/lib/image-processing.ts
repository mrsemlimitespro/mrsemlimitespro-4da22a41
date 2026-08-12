/**
 * Pré-processamento de imagens no cliente.
 *
 * Funcionalidades:
 *   - Validação de MIME + tamanho.
 *   - Correção de orientação (o navegador aplica EXIF ao desenhar o
 *     Image no canvas; para HEIC pesado, browsers modernos já normalizam).
 *   - Redimensionamento proporcional a `maxWidth`/`maxHeight`.
 *   - Compressão para JPEG/WEBP.
 *   - Conversão para formato de destino.
 *
 * Tudo roda em Web Worker-friendly APIs (Image + Canvas) — funciona
 * igual no WebView do Capacitor e no navegador.
 */

export type ImageMime = "image/jpeg" | "image/png" | "image/webp";

const DEFAULT_ALLOWED: readonly ImageMime[] = ["image/jpeg", "image/png", "image/webp"];

export interface ProcessOptions {
  /** Formato de saída. Default: `image/jpeg`. */
  targetMime?: ImageMime;
  /** 0..1 — qualidade para JPEG/WEBP. Default: 0.82. */
  quality?: number;
  /** Redimensiona respeitando a proporção. */
  maxWidth?: number;
  maxHeight?: number;
  /** Tamanho máximo aceito em bytes ANTES do processamento. Default: 25 MB. */
  maxInputBytes?: number;
  /** Tamanho máximo aceito em bytes APÓS o processamento. Default: 5 MB. */
  maxOutputBytes?: number;
  /** MIMEs de entrada permitidos. Default: JPEG/PNG/WEBP. */
  allowedMimes?: readonly ImageMime[];
}

export interface ProcessedImage {
  blob: Blob;
  mime: ImageMime;
  width: number;
  height: number;
  size: number;
}

export type ProcessError =
  | { code: "invalid_mime"; message: string }
  | { code: "too_large_input"; message: string }
  | { code: "too_large_output"; message: string }
  | { code: "decode_failed"; message: string }
  | { code: "encode_failed"; message: string };

export type ProcessResult = { ok: true; data: ProcessedImage } | { ok: false; error: ProcessError };

function extForMime(mime: ImageMime): string {
  return mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
}

export function fileNameWithExt(base: string, mime: ImageMime): string {
  const ext = extForMime(mime);
  const clean = base.replace(/\.[^.]+$/, "");
  return `${clean || "image"}.${ext}`;
}

function decode(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode_failed"));
    };
    img.src = url;
  });
}

function computeSize(
  w: number,
  h: number,
  maxW?: number,
  maxH?: number,
): { width: number; height: number } {
  if (!maxW && !maxH) return { width: w, height: h };
  const rw = maxW ? maxW / w : Infinity;
  const rh = maxH ? maxH / h : Infinity;
  const r = Math.min(rw, rh, 1);
  return { width: Math.round(w * r), height: Math.round(h * r) };
}

export async function processImage(input: Blob, opts: ProcessOptions = {}): Promise<ProcessResult> {
  const allowed = opts.allowedMimes ?? DEFAULT_ALLOWED;
  const maxIn = opts.maxInputBytes ?? 25 * 1024 * 1024;
  const maxOut = opts.maxOutputBytes ?? 5 * 1024 * 1024;
  const targetMime: ImageMime = opts.targetMime ?? "image/jpeg";
  const quality = opts.quality ?? 0.82;

  if (!allowed.includes(input.type as ImageMime)) {
    return {
      ok: false,
      error: {
        code: "invalid_mime",
        message: `Formato ${input.type || "desconhecido"} não é permitido.`,
      },
    };
  }
  if (input.size > maxIn) {
    return {
      ok: false,
      error: {
        code: "too_large_input",
        message: `Imagem excede o limite de ${Math.round(maxIn / 1024 / 1024)} MB.`,
      },
    };
  }

  let img: HTMLImageElement;
  try {
    img = await decode(input);
  } catch {
    return {
      ok: false,
      error: { code: "decode_failed", message: "Não foi possível ler a imagem." },
    };
  }

  const { width, height } = computeSize(
    img.naturalWidth,
    img.naturalHeight,
    opts.maxWidth,
    opts.maxHeight,
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { ok: false, error: { code: "encode_failed", message: "Canvas indisponível." } };
  // O browser aplica EXIF ao desenhar Image → naturalWidth/Height já vêm normalizados.
  ctx.drawImage(img, 0, 0, width, height);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, targetMime, quality),
  );
  if (!blob)
    return { ok: false, error: { code: "encode_failed", message: "Falha ao codificar imagem." } };
  if (blob.size > maxOut) {
    return {
      ok: false,
      error: {
        code: "too_large_output",
        message: `Imagem final excede ${Math.round(maxOut / 1024 / 1024)} MB.`,
      },
    };
  }

  return { ok: true, data: { blob, mime: targetMime, width, height, size: blob.size } };
}

/** Presets prontos para as principais superfícies do app. */
export const IMAGE_PRESETS = {
  avatar: { maxWidth: 512, maxHeight: 512, quality: 0.85, targetMime: "image/jpeg" as ImageMime },
  cover: { maxWidth: 1600, maxHeight: 1600, quality: 0.82, targetMime: "image/jpeg" as ImageMime },
  thumbnail: { maxWidth: 800, maxHeight: 800, quality: 0.8, targetMime: "image/webp" as ImageMime },
  original: { quality: 0.92, targetMime: "image/jpeg" as ImageMime },
} as const satisfies Record<string, ProcessOptions>;
