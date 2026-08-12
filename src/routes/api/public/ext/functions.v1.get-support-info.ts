import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "content-type": "application/json",
  "cache-control": "public, max-age=120",
};

/**
 * Compat: /functions/v1/get-support-info
 * Retorna { whatsapp_url } lido de admin_settings.config_extensao.
 */
export const Route = createFileRoute("/api/public/ext/functions/v1/get-support-info")({
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
        const cfg = (data?.config_extensao as any) ?? {};
        return new Response(
          JSON.stringify({
            whatsapp_url: cfg.whatsapp_url ?? cfg.suporte_whatsapp ?? null,
            support_email: cfg.support_email ?? null,
          }),
          { status: 200, headers: cors },
        );
      },
    },
  },
});
