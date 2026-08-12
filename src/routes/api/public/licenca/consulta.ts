import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "content-type": "application/json",
};

export const Route = createFileRoute("/api/public/licenca/consulta")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const chave = (url.searchParams.get("chave") ?? "").trim();
        // FASE 2 (multi-extensão): leitura opcional de `extension_id` (query param). Reservado para uso futuro.
        // Não é passado à RPC `consulta_licenca_publica`; comportamento inalterado se ausente.
        const extension_id = (url.searchParams.get("extension_id") ?? "").slice(0, 80) || null;
        void extension_id;
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
        const { data, error } = await sb.rpc("consulta_licenca_publica", { _chave: chave });
        if (error) {
          return new Response(JSON.stringify({ ok: false, error: "rpc_failed" }), {
            status: 200,
            headers: cors,
          });
        }
        return new Response(JSON.stringify(data), { status: 200, headers: cors });
      },
    },
  },
});
