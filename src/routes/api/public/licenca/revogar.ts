import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "content-type": "application/json",
};

/**
 * Auto-logout do dispositivo — remove o device do vínculo mas não cancela a licença.
 */
export const Route = createFileRoute("/api/public/licenca/revogar")({
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
        if (!chave || !device_id) {
          return new Response(JSON.stringify({ ok: false, error: "missing_params" }), {
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
          .select("id, device_id")
          .eq("chave", chave)
          .maybeSingle();
        if (!lic) {
          return new Response(JSON.stringify({ ok: false, error: "not_found" }), {
            status: 200,
            headers: cors,
          });
        }

        await sb.from("licenca_dispositivos").delete().eq("licenca_id", lic.id).eq("device_id", device_id);
        if (lic.device_id === device_id) {
          await sb.from("licencas").update({ device_id: null }).eq("id", lic.id);
        }
        await sb.from("licencas_eventos").insert({
          licenca_id: lic.id,
          tipo: "reset",
          mensagem: "Dispositivo revogou o próprio acesso",
          device_id,
        });

        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
      },
    },
  },
});
