/**
 * UploadService — envia imagens processadas ao Supabase Storage.
 *
 * Regras:
 *   - Desacoplado do CameraService: recebe um Blob (qualquer origem).
 *   - Todo caminho começa com o `user_id` (compatível com as RLS
 *     policies do bucket `user-uploads`).
 *   - MIME e tamanho SÃO revalidados antes do upload.
 *   - Após upload, o blob:URL da fonte pode ser revogado pelo caller.
 *   - Retorna `{ path, publicUrl?, signedUrl? }` — o consumidor escolhe
 *     como referenciar.
 *
 * Categorias suportadas (paths canônicos):
 *   - avatar    → `<uid>/avatar/<random>.<ext>`
 *   - prompt    → `<uid>/prompts/<random>.<ext>`
 *   - pack      → `<uid>/packs/<random>.<ext>`
 *   - agent     → `<uid>/agents/<random>.<ext>`
 *   - misc      → `<uid>/misc/<random>.<ext>` (anexos futuros)
 */
import { supabase } from "@/integrations/supabase/client";
import {
  IMAGE_PRESETS,
  processImage,
  type ImageMime,
  type ProcessOptions,
} from "@/lib/image-processing";

export type UploadCategory = "avatar" | "prompt" | "pack" | "agent" | "misc";

const CATEGORY_FOLDER: Record<UploadCategory, string> = {
  avatar: "avatar",
  prompt: "prompts",
  pack: "packs",
  agent: "agents",
  misc: "misc",
};

const CATEGORY_PRESET: Record<UploadCategory, ProcessOptions> = {
  avatar: IMAGE_PRESETS.avatar,
  prompt: IMAGE_PRESETS.cover,
  pack: IMAGE_PRESETS.cover,
  agent: IMAGE_PRESETS.cover,
  misc: IMAGE_PRESETS.thumbnail,
};

export const UPLOAD_BUCKET = "user-uploads";

export interface UploadOptions {
  /** Sobrescreve o preset da categoria. */
  process?: ProcessOptions;
  /** Não processa a imagem (envia o Blob como está). Default: false. */
  skipProcessing?: boolean;
  /** Assina uma URL de leitura por N segundos após o upload. */
  signedUrlSeconds?: number;
  /** Nome de arquivo desejado (sem extensão). */
  fileNameHint?: string;
}

export interface UploadResult {
  bucket: string;
  path: string;
  size: number;
  mime: ImageMime;
  width?: number;
  height?: number;
  signedUrl?: string;
}

export type UploadError =
  | { code: "not_authenticated"; message: string }
  | { code: "invalid_mime"; message: string }
  | { code: "too_large"; message: string }
  | { code: "processing_failed"; message: string }
  | { code: "upload_failed"; message: string };

export type UploadReturn = { ok: true; data: UploadResult } | { ok: false; error: UploadError };

function extForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function randomKey(hint?: string): string {
  const stamp = Date.now();
  const rand = crypto.randomUUID().slice(0, 8);
  return hint ? `${hint}-${stamp}-${rand}` : `${stamp}-${rand}`;
}

export async function uploadImage(
  category: UploadCategory,
  blob: Blob,
  opts: UploadOptions = {},
): Promise<UploadReturn> {
  const { data: sess } = await supabase.auth.getSession();
  const user = sess.session?.user;
  if (!user) {
    return { ok: false, error: { code: "not_authenticated", message: "Sessão expirada." } };
  }

  let outBlob = blob;
  let outMime: ImageMime = (blob.type as ImageMime) || "image/jpeg";
  let width: number | undefined;
  let height: number | undefined;

  if (!opts.skipProcessing) {
    const preset = { ...CATEGORY_PRESET[category], ...opts.process };
    const r = await processImage(blob, preset);
    if (!r.ok) {
      const map: Record<typeof r.error.code, UploadError["code"]> = {
        invalid_mime: "invalid_mime",
        too_large_input: "too_large",
        too_large_output: "too_large",
        decode_failed: "processing_failed",
        encode_failed: "processing_failed",
      };
      return { ok: false, error: { code: map[r.error.code], message: r.error.message } };
    }
    outBlob = r.data.blob;
    outMime = r.data.mime;
    width = r.data.width;
    height = r.data.height;
  }

  const folder = CATEGORY_FOLDER[category];
  const ext = extForMime(outMime);
  const path = `${user.id}/${folder}/${randomKey(opts.fileNameHint)}.${ext}`;

  const { error: upErr } = await supabase.storage.from(UPLOAD_BUCKET).upload(path, outBlob, {
    contentType: outMime,
    cacheControl: "3600",
    upsert: category === "avatar", // avatar sobrescreve; demais criam novos
  });
  if (upErr) {
    return { ok: false, error: { code: "upload_failed", message: upErr.message } };
  }

  let signedUrl: string | undefined;
  if (opts.signedUrlSeconds && opts.signedUrlSeconds > 0) {
    const { data: signed } = await supabase.storage
      .from(UPLOAD_BUCKET)
      .createSignedUrl(path, opts.signedUrlSeconds);
    signedUrl = signed?.signedUrl;
  }

  return {
    ok: true,
    data: {
      bucket: UPLOAD_BUCKET,
      path,
      size: outBlob.size,
      mime: outMime,
      width,
      height,
      signedUrl,
    },
  };
}

/** Assina uma URL de leitura para um path já enviado. */
export async function createSignedUrl(path: string, seconds = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from(UPLOAD_BUCKET).createSignedUrl(path, seconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Remove um arquivo enviado (RLS garante que só o dono consegue). */
export async function removeUpload(path: string): Promise<boolean> {
  const { error } = await supabase.storage.from(UPLOAD_BUCKET).remove([path]);
  return !error;
}
