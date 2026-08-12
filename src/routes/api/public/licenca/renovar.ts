import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "content-type": "application/json",
};

/**
 * Solicitação de renovação vinda da extensão.
 * Aqui NÃO executamos a renovação — apenas registramos a intenção. A renovação
 * efetiva acontece via webhook de pagamento (Cakto/Kiwify/MP) ou aprovação do
 * admin em `/admin/licencas`. Assim evitamos autorenovação sem cobrança real.
 */
export const Route = createFileRoute("/api/public/licenca/renovar")({
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
        const chave = String(body?.chave ?? "").trim();
        const email = body?.email ? String(body.email).trim() : null;
        if (!chave) {
          return new Response(JSON.stringify({ ok: false, error: "missing_chave" }), {
            status: 200,
            headers: cors,
          });
        }
        const sb = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );

        const { data: lic } = await sb
          .from("licencas")
          .select("id, revendedor_id")
          .eq("chave", chave)
          .maybeSingle();

        if (!lic) {
          return new Response(JSON.stringify({ ok: false, error: "not_found" }), {
            status: 200,
            headers: cors,
          });
        }

        await sb.from("licencas_eventos").insert({
          licenca_id: lic.id,
          tipo: "renovacao_solicitada",
          mensagem: "Renovação solicitada pela extensão",
          metadata: { email },
        });

        return new Response(
          JSON.stringify({
            ok: true,
            estado: "PENDING",
            mensagem: "Solicitação registrada. Aguarde processamento do pagamento.",
          }),
          { status: 200, headers: cors },
        );
      },
    },
  },
});
