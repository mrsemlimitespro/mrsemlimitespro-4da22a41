import { createHmac, timingSafeEqual } from "node:crypto";

export type GatewaySlug = "mercadopago" | "kiwify" | "cakto";

export type NormalizedEvent = {
  slug: GatewaySlug;
  eventType: string;
  externalId: string | null;
  refCandidates: string[];
  status: "aprovado" | "recusado" | "pendente" | "reembolsado" | "cancelado" | "outro";
  amount: number | null;
  currency: string | null;
  method: string | null;
  productRef: string | null;
  clienteNome: string | null;
  clienteEmail: string | null;
  raw: unknown;
};

function pickString(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

function pickNumber(...vals: unknown[]): number | null {
  for (const v of vals) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  }
  return null;
}

function mapStatus(raw: string | null): NormalizedEvent["status"] {
  if (!raw) return "outro";
  const s = raw.toLowerCase();
  if (["approved", "aprovado", "paid", "completed", "success"].includes(s)) return "aprovado";
  if (["rejected", "refused", "recusado", "declined", "failed"].includes(s)) return "recusado";
  if (["pending", "in_process", "pendente", "aguardando", "waiting"].includes(s)) return "pendente";
  if (["refunded", "reembolsado", "chargeback"].includes(s)) return "reembolsado";
  if (["canceled", "cancelled", "cancelado"].includes(s)) return "cancelado";
  return "outro";
}

export function normalizeEvent(slug: GatewaySlug, payload: any): NormalizedEvent {
  const raw = payload ?? {};
  if (slug === "mercadopago") {
    const data = raw.data ?? {};
    return {
      slug,
      eventType: pickString(raw.action, raw.type, "payment.update") ?? "payment.update",
      externalId: pickString(data.id, raw.id),
      refCandidates: [pickString(data.external_reference, raw.external_reference)].filter(
        Boolean,
      ) as string[],
      status: mapStatus(pickString(data.status, raw.status)),
      amount: pickNumber(data.transaction_amount, raw.transaction_amount),
      currency: pickString(data.currency_id, raw.currency_id) ?? "BRL",
      method: pickString(data.payment_method_id, raw.payment_method_id),
      clienteNome: pickString(data.payer?.name, raw.payer?.name),
      clienteEmail: pickString(data.payer?.email, raw.payer?.email),
      productRef: pickString(raw.metadata?.product_id, data.metadata?.product_id, raw.product_id),
      raw,
    };
  }
  if (slug === "kiwify") {
    return {
      slug,
      eventType: pickString(raw.webhook_event_type, raw.event, raw.order_status) ?? "order.update",
      externalId: pickString(raw.order_id, raw.transaction_id, raw.id),
      refCandidates: [
        pickString(raw.order_ref, raw.reference, raw.external_reference, raw.metadata?.ref),
      ].filter(Boolean) as string[],
      status: mapStatus(pickString(raw.order_status, raw.status)),
      amount: pickNumber(raw.Commissions?.charge_amount, raw.order_amount, raw.total, raw.amount),
      currency: pickString(raw.currency) ?? "BRL",
      method: pickString(raw.payment_method, raw.method),
      clienteNome: pickString(raw.Customer?.full_name, raw.customer?.name, raw.customer_name),
      clienteEmail: pickString(raw.Customer?.email, raw.customer?.email, raw.customer_email),
      productRef: pickString(
        raw.Product?.product_id,
        raw.Product?.id,
        raw.product_id,
        raw.product?.id,
        raw.product?.product_id,
        raw.plan?.id,
        raw.subscription?.plan?.id,
      ),
      raw,
    };
  }
  // cakto
  return {
    slug,
    eventType: pickString(raw.event, raw.type, raw.status) ?? "sale.update",
    externalId: pickString(raw.data?.id, raw.id, raw.transaction_id),
    refCandidates: [
      pickString(raw.data?.reference, raw.reference, raw.external_reference, raw.metadata?.ref),
    ].filter(Boolean) as string[],
    status: mapStatus(pickString(raw.data?.status, raw.status)),
    amount: pickNumber(raw.data?.amount, raw.amount, raw.value),
    currency: pickString(raw.currency) ?? "BRL",
    method: pickString(raw.data?.payment_method, raw.payment_method, raw.method),
    clienteNome: pickString(raw.data?.customer?.name, raw.customer?.name),
    clienteEmail: pickString(raw.data?.customer?.email, raw.customer?.email),
    productRef: pickString(raw.data?.product_id, raw.product_id, raw.data?.offer_id, raw.offer_id),
    raw,
  };
}

/** Verify HMAC-SHA256 of the raw body. Returns true when signature matches OR when no secret is configured (allow test mode). */
export function verifySignature(opts: {
  slug: GatewaySlug;
  rawBody: string;
  headers: Headers;
  secret: string | null;
}): { ok: boolean; reason: string } {
  const { slug, rawBody, headers, secret } = opts;
  if (!secret) return { ok: true, reason: "no-secret-configured" };

  // Mercado Pago: x-signature: ts=..., v1=<hex sha256(dataId + requestId + ts)>
  if (slug === "mercadopago") {
    const sig = headers.get("x-signature") ?? "";
    const reqId = headers.get("x-request-id") ?? "";
    const parts = Object.fromEntries(
      sig.split(",").map((p) => {
        const [k, v] = p.split("=").map((s) => s.trim());
        return [k, v ?? ""];
      }),
    );
    const ts = parts.ts;
    const v1 = parts.v1;
    if (!ts || !v1) return { ok: false, reason: "missing-mp-signature" };
    let dataId = "";
    try {
      dataId = JSON.parse(rawBody)?.data?.id?.toString() ?? "";
    } catch {}
    const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
    const expected = createHmac("sha256", secret).update(manifest).digest("hex");
    return safeEq(v1, expected)
      ? { ok: true, reason: "mp-ok" }
      : { ok: false, reason: "mp-mismatch" };
  }

  // Kiwify / Cakto: raw body HMAC-SHA256 (hex) via common header names
  const provided =
    headers.get("x-kiwify-signature") ??
    headers.get("x-cakto-signature") ??
    headers.get("x-signature") ??
    headers.get("x-webhook-signature") ??
    "";
  if (!provided) return { ok: false, reason: "missing-signature" };
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEq(provided.replace(/^sha256=/i, ""), expected)
    ? { ok: true, reason: "hmac-ok" }
    : { ok: false, reason: "hmac-mismatch" };
}

function safeEq(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  try {
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
