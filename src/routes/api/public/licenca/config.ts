import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "content-type": "application/json",
  "cache-control": "public, max-age=60",
};

export const Route = createFileRoute("/api/public/licenca/config")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async () => {
        const sb = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );
        const { data } = await sb
          .from("admin_settings")
          .select("config_extensao")
          .eq("singleton", true)
          .maybeSingle();

        return new Response(
          JSON.stringify({
            ok: true,
            config: data?.config_extensao ?? {
              versao_minima: "1.0.0",
              heartbeat_intervalo_seg: 300,
              endpoints: {},
              feature_flags: {},
              aviso: null,
            },
          }),
          { status: 200, headers: cors },
        );
      },
    },
  },
});
