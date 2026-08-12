import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "content-type, authorization, apikey, x-client-info, x-session-token",
  "content-type": "application/json",
  "cache-control": "public, max-age=60",
};

/**
 * Compat: /functions/v1/get-templates
 * Retorna a lista de templates armazenada em admin_settings.config_extensao.templates.
 */
export const Route = createFileRoute("/api/public/ext/functions/v1/get-templates")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async () => await respond(),
      POST: async () => await respond(),
    },
  },
});

async function respond() {
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
  const templates = Array.isArray(cfg.templates) ? cfg.templates : [];
  return new Response(JSON.stringify({ ok: true, templates }), { status: 200, headers: cors });
}
