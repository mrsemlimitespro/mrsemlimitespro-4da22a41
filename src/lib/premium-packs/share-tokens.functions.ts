/**
 * Tokens HMAC para links temporários de Pack (Share Center).
 *
 * O dialog de compartilhamento mintra um token assinado no servidor contendo
 * o pack_id + expiração. A landing valida via HMAC antes de liberar o acesso,
 * impedindo que um atacante apenas edite `?exp=…` para estender a validade.
 *
 * Segredo: derivado de SUPABASE_SERVICE_ROLE_KEY. Caso a chave gire, todos os
 * tokens em circulação expiram — comportamento aceito.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MAX_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

function getSecret(): string {
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_URL || "";
  if (!s) throw new Error("share-tokens: missing signing material");
  return `pack-share-v1:${s}`;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sign(slug: string, packId: string, exp: number): Promise<string> {
  const { createHmac } = await import("crypto");
  const payload = `${slug}.${packId}.${exp}`;
  return b64url(createHmac("sha256", getSecret()).update(payload).digest());
}

export const mintTempShareToken = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        slug: z.string().trim().min(1).max(160),
        ttlMs: z.number().int().positive().max(MAX_TTL_MS),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pack } = await supabaseAdmin
      .from("premium_packs")
      .select("id, status, visibility_status")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!pack || pack.status !== "ativo" || pack.visibility_status === "desativado") {
      throw new Error("Pack indisponível");
    }
    const exp = Date.now() + data.ttlMs;
    const sig = await sign(data.slug, pack.id, exp);
    return { token: sig, exp };
  });

export const validateTempShareToken = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        slug: z.string().trim().min(1).max(160),
        token: z.string().trim().min(8).max(256),
        exp: z.number().int().positive(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    if (Date.now() > data.exp) return { valid: false as const, reason: "expired" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pack } = await supabaseAdmin
      .from("premium_packs")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!pack) return { valid: false as const, reason: "not_found" };
    const expected = await sign(data.slug, pack.id, data.exp);
    const { timingSafeEqual } = await import("crypto");
    const a = Buffer.from(expected);
    const b = Buffer.from(data.token);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { valid: false as const, reason: "invalid_signature" };
    }
    return { valid: true as const, exp: data.exp };
  });
