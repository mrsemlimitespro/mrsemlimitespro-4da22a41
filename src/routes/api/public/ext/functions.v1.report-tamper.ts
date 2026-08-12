import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

/**
 * Recebe eventos de anti-tamper da extensão (DevTools aberto, F12, tentativa de
 * inspeção, integridade de código, etc.). Registra em `licencas_eventos` e
 * devolve orientação ao SDK:
 *  - `action: "allow"`   → é admin, ignora tudo (Rogério pode fazer o que quiser).
 *  - `action: "warn"`    → primeiro/segundo sinal, só avisa na extensão.
 *  - `action: "block"`   → passou do limite, bloqueia com mensagem.
 *
 * Não altera SDK; só serve o SDK quando ele passar a reportar. Endpoint
 * independente — não interfere com validate-license-v2 nem heartbeat.
 */
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "content-type": "application/json",
};

const ADMIN_EMAILS = new Set([
  "rogeriocftv.mr@gmail.com",
  "mariocftv@gmail.com",
]);

const KNOWN_SIGNALS = new Set([
  "devtools_open",
  "debugger_detected",
  "context_inspected",
  "integrity_mismatch",
  "console_tampering",
  "source_view_attempt",
  "extension_repack",
  "manual",
]);

const SUPORTE_NUM = "5511962579428";

export const Route = createFileRoute("/api/public/ext/functions/v1/report-tamper")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        let body: any = {};
        try {
          body = await request.json();
        } catch {
          /* noop */
        }

        const key = String(body?.license_key ?? "").trim();
        const rawSignal = String(body?.signal ?? "manual").trim().toLowerCase();
        const signal = KNOWN_SIGNALS.has(rawSignal) ? rawSignal : "manual";
        const hwid = body?.hwid ? String(body.hwid).slice(0, 200) : null;
        const details = body?.details && typeof body.details === "object" ? body.details : {};
        const userAgent = String(body?.user_agent ?? request.headers.get("user-agent") ?? "").slice(0, 400);

        if (!key) {
          return new Response(
            JSON.stringify({ ok: false, action: "warn", error: "missing_key" }),
            { status: 200, headers: cors },
          );
        }

        const sb = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );

        const { data: lic } = await sb
          .from("licencas")
          .select("id, email, cliente_id, status, clientes:cliente_id(email)")
          .eq("chave", key)
          .maybeSingle();

        if (!lic) {
          return new Response(
            JSON.stringify({ ok: false, action: "warn", error: "license_not_found" }),
            { status: 200, headers: cors },
          );
        }

        const email = String(
          (lic as any).email || (lic as any).clientes?.email || "",
        ).toLowerCase();

        // BYPASS TOTAL para admin — Rogério pode inspecionar/abrir DevTools livre.
        if (email && ADMIN_EMAILS.has(email)) {
          return new Response(
            JSON.stringify({
              ok: true,
              action: "allow",
              admin: true,
              message: null,
            }),
            { status: 200, headers: cors },
          );
        }

        // Registra o evento
        await sb.from("licencas_eventos").insert({
          licenca_id: lic.id,
          cliente_id: lic.cliente_id ?? null,
          tipo: `tamper:${signal}`,
          mensagem: `Tentativa de inspeção detectada (${signal})`,
          device_id: hwid,
          metadata: {
            signal,
            details,
            user_agent: userAgent,
          },
        });

        // Conta eventos de tamper nas últimas 24h (apenas informativo)
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count } = await sb
          .from("licencas_eventos")
          .select("id", { count: "exact", head: true })
          .eq("licenca_id", lic.id)
          .like("tipo", "tamper:%")
          .gte("created_at", since);

        const total = Number(count ?? 1);

        // POLÍTICA: nunca bloqueia automaticamente. Só o admin bloqueia/desbloqueia
        // manualmente no painel. A extensão apenas exibe aviso legal de proibição
        // de engenharia reversa. Registramos o evento para o painel monitorar.
        return new Response(
          JSON.stringify({
            ok: true,
            action: "warn",
            tamper_count: total,
            message:
              "AVISO LEGAL: É proibida a engenharia reversa, descompilação, inspeção ou uso de IA para analisar o código desta extensão. Somente o administrador rogeriocftv.mr@gmail.com está autorizado. Violações serão registradas.",
            support_whatsapp: SUPORTE_NUM,
            support_whatsapp_url: `https://wa.me/${SUPORTE_NUM}?text=${encodeURIComponent(
              `Olá, sou usuário do MR Sem Limites e preciso de suporte. Chave: ${key}`,
            )}`,
          }),
          { status: 200, headers: cors },
        );
      },
    },
  },
});

