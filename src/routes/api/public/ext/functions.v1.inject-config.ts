import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

/**
 * Compatibility layer para a extensão MR LOV 2.2 (endpoint antigo: inject-config).
 * Recebe {key, email?} e devolve {license:{plan,expires_at,bound_email}, config}.
 * Toda validação usa exclusivamente o banco do MR Sem Limites.
 */
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "content-type": "application/json",
};

export const Route = createFileRoute("/api/public/ext/functions/v1/inject-config")({
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
        const key = String(body?.key ?? "").trim();
        const email = body?.email ? String(body.email).trim() : null;
        // FASE 2 (multi-extensão): leitura opcional de `extension_id`. Reservado para uso futuro.
        // Sem alterar validação, config retornada ou reason codes. Comportamento inalterado se ausente.
        const extension_id = body?.extension_id ? String(body.extension_id).slice(0, 80) : null;
        void extension_id;

        if (!key) {
          return new Response(
            JSON.stringify({ error: "Chave vazia", reason: "invalid_key" }),
            { status: 401, headers: cors },
          );
        }

        const sb = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );

        // Expira trials vencidos (lazy)
        try {
          await sb.rpc("expirar_trials_vencidos");
        } catch {
          /* noop */
        }

        const { data: lic } = await sb
          .from("licencas")
          .select(
            "id, chave, email, status, tipo, expira_em, trial_iniciado_em, trial_duracao_minutos, device_id",
          )
          .eq("chave", key)
          .maybeSingle();

        if (!lic) {
          return new Response(
            JSON.stringify({ error: "Licença inválida", reason: "invalid_key" }),
            { status: 403, headers: cors },
          );
        }

        if (lic.email && email && lic.email.toLowerCase() !== email.toLowerCase()) {
          return new Response(
            JSON.stringify({ error: "E-mail não confere", reason: "invalid_key" }),
            { status: 403, headers: cors },
          );
        }

        if (lic.status === "cancelada" || lic.status === "revogada") {
          return new Response(
            JSON.stringify({ error: "Licença revogada", reason: "revoked" }),
            { status: 403, headers: cors },
          );
        }

        // Trial ainda não iniciado: iniciar agora
        let expira_em = lic.expira_em;
        if (lic.tipo === "teste" && !lic.trial_iniciado_em) {
          const now = new Date();
          const mins = Number(lic.trial_duracao_minutos ?? 30);
          expira_em = new Date(now.getTime() + mins * 60_000).toISOString();
          await sb
            .from("licencas")
            .update({
              trial_iniciado_em: now.toISOString(),
              expira_em,
              ativada_em: now.toISOString(),
            })
            .eq("id", lic.id);
        }

        if (expira_em && new Date(expira_em).getTime() < Date.now()) {
          await sb.from("licencas").update({ status: "expirada" }).eq("id", lic.id);
          return new Response(
            JSON.stringify({ error: "Licença expirada", reason: "expired" }),
            { status: 403, headers: cors },
          );
        }

        if (lic.status !== "ativa") {
          return new Response(
            JSON.stringify({ error: "Licença inativa", reason: "invalid_key" }),
            { status: 403, headers: cors },
          );
        }

        // Config pelo painel admin
        const { data: settings } = await sb
          .from("admin_settings")
          .select("config_extensao")
          .eq("singleton", true)
          .maybeSingle();

        const config = (settings?.config_extensao as any) ?? {};

        return new Response(
          JSON.stringify({
            license: {
              plan: lic.tipo === "premium" ? "premium" : "trial",
              expires_at: expira_em,
              bound_email: lic.email,
            },
            config,
          }),
          { status: 200, headers: cors },
        );
      },
    },
  },
});
