import type { GatewaySlug, NormalizedEvent } from "./gateway.server";
import { normalizeEvent, verifySignature } from "./gateway.server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function handleWebhook(slug: GatewaySlug, request: Request): Promise<Response> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const rawBody = await request.text();
  let payload: any = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    payload = { _raw: rawBody };
  }

  // Load gateway secret
  const { data: gw } = await supabaseAdmin
    .from("payment_gateways")
    .select("webhook_secret, enabled")
    .eq("slug", slug)
    .maybeSingle();

  const secret = gw?.webhook_secret ?? null;
  const verify = verifySignature({ slug, rawBody, headers: request.headers, secret });

  // Always log receipt (before enforcement) — for audit
  const event = normalizeEvent(slug, payload);
  const baseLog = {
    gateway_slug: slug,
    event_type: event.eventType,
    payload: payload as never,
  };

  if (!verify.ok) {
    await supabaseAdmin.from("payment_webhook_logs").insert({
      ...baseLog,
      status: "rejected",
      error: `signature:${verify.reason}`,
    });
    return new Response(`invalid signature (${verify.reason})`, { status: 401 });
  }

  if (gw && gw.enabled === false) {
    await supabaseAdmin.from("payment_webhook_logs").insert({
      ...baseLog,
      status: "ignored",
      error: "gateway-disabled",
    });
    return new Response("gateway disabled", { status: 200 });
  }

  const result = await processEvent(event, supabaseAdmin);

  // Auto-provisão de revendedor: Kiwify + aprovado + produto configurado.
  let provision: { ok: boolean; reason: string } | null = null;
  if (slug === "kiwify" && event.status === "aprovado") {
    try {
      const { data: cfg } = await supabaseAdmin
        .from("admin_settings")
        .select("kiwify_produto_revendedor_ref")
        .limit(1)
        .maybeSingle();
      const configuredRef = ((cfg ?? {}) as Record<string, string | null>)
        .kiwify_produto_revendedor_ref;
      const matches =
        !!configuredRef &&
        !!event.productRef &&
        configuredRef.trim() === event.productRef.trim();
      if (matches && event.clienteEmail) {
        const { provisionRevendedor } = await import("@/lib/revendedores/provision.server");
        const r = await provisionRevendedor({
          email: event.clienteEmail,
          nome: event.clienteNome,
          amount: event.amount,
          externalId: event.externalId,
        });
        provision = { ok: r.ok, reason: r.reason };
      }
    } catch (e: any) {
      provision = { ok: false, reason: `provision-error:${e?.message ?? e}` };
    }
  }

  await supabaseAdmin.from("payment_webhook_logs").insert({
    ...baseLog,
    status: result.status,
    error: provision ? `${result.error ?? ""}${result.error ? "; " : ""}provision:${provision.reason}` : result.error,
  });

  return new Response(JSON.stringify({ ...result, provision }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

async function processEvent(
  event: NormalizedEvent,
  supabaseAdmin: Awaited<ReturnType<typeof getAdmin>>,
) {
  // Try to locate the transaction: (1) by our uuid via ref candidates,
  // (2) by (gateway_slug, external_id).
  let txn: { id: string; status: string; creditos_liberados: number | null } | null = null;

  for (const ref of event.refCandidates) {
    if (UUID_RE.test(ref)) {
      const { data } = await supabaseAdmin
        .from("payment_transactions")
        .select("id, status, creditos_liberados")
        .eq("id", ref)
        .maybeSingle();
      if (data) {
        txn = data;
        break;
      }
    }
  }

  if (!txn && event.externalId) {
    const { data } = await supabaseAdmin
      .from("payment_transactions")
      .select("id, status, creditos_liberados")
      .eq("gateway_slug", event.slug)
      .eq("external_id", event.externalId)
      .maybeSingle();
    if (data) txn = data;
  }

  if (!txn) {
    return { status: "orphan", error: "transaction-not-found" as string | null };
  }

  // Avoid duplicate approval
  if (
    txn.status === "aprovado" &&
    (txn.creditos_liberados ?? 0) > 0 &&
    event.status === "aprovado"
  ) {
    return { status: "duplicate", error: null };
  }

  // Map our internal status literal
  const nextStatus =
    event.status === "outro"
      ? txn.status
      : event.status === "cancelado"
        ? "recusado"
        : event.status;

  const update = {
    status: nextStatus,
    metadata: {
      last_event: event.eventType,
      last_seen_at: new Date().toISOString(),
      external: event.raw as unknown,
    } as never,
    ...(event.externalId ? { external_id: event.externalId } : {}),
    ...(event.method ? { metodo: event.method } : {}),
    ...(event.clienteNome ? { cliente_nome: event.clienteNome } : {}),
  };

  const { error } = await supabaseAdmin
    .from("payment_transactions")
    .update(update)
    .eq("id", txn.id);

  if (error) {
    return { status: "error", error: error.message };
  }

  return { status: "ok", error: null };
}

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
