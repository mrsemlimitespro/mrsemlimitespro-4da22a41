import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "content-type": "application/json",
};

export const Route = createFileRoute("/api/public/licenca/heartbeat")({
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
        const device_id = body?.device_id ? String(body.device_id).trim() : null;
        // FASE 2 (multi-extensão): leitura opcional de `extension_id`. Reservado para uso futuro.
        // Não passado à RPC `heartbeat_licenca`; comportamento inalterado.
        const extension_id = body?.extension_id ? String(body.extension_id).slice(0, 80) : null;
        void extension_id;

        if (!chave) {
          return new Response(
            JSON.stringify({ ok: false, estado: "REVOKED", error: "missing_chave" }),
            { status: 200, headers: cors },
          );
        }

        const sb = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );

        const { data, error } = await sb.rpc("heartbeat_licenca", {
          _chave: chave,
          _device_id: device_id,
        });

        if (error) {
          return new Response(
            JSON.stringify({ ok: false, estado: "REVOKED", error: "rpc_failed" }),
            { status: 200, headers: cors },
          );
        }
        return new Response(JSON.stringify(data), { status: 200, headers: cors });
      },
    },
  },
});
