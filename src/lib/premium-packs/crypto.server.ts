/**
 * AES-256-GCM utilitário server-only para blobs sensíveis dos Packs Premium
 * (ex.: URL da pasta de origem). A chave é derivada do
 * `SUPABASE_SERVICE_ROLE_KEY` — se ela girar, blobs existentes se tornam
 * ilegíveis (comportamento aceito e documentado).
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

export type EncryptedBlob = { v: 1; iv: string; tag: string; ct: string };

function getKey(): Buffer {
  const material =
    process.env.PACKS_ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_URL ||
    "";
  if (!material) throw new Error("crypto.server: missing key material");
  return createHash("sha256").update(`premium-packs-v1:${material}`).digest();
}

export function encryptSecret(plain: string): EncryptedBlob {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ct: ct.toString("base64"),
  };
}

export function decryptSecret(blob: EncryptedBlob): string {
  const iv = Buffer.from(blob.iv, "base64");
  const tag = Buffer.from(blob.tag, "base64");
  const ct = Buffer.from(blob.ct, "base64");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plain.toString("utf8");
}
