import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'content-type': 'application/json',
};

export const Route = createFileRoute('/api/public/ext/fix-stream')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const licenseKey = body.license_key || body.licenseKey || body.key || body.user_license_key;
          const hwid = body.hwid || body.device_id;

          if (!licenseKey || !hwid) {
            return new Response(JSON.stringify({ ok: false, error: "missing_auth_metadata" }), { status: 400, headers: cors });
          }

          const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
            auth: { persistSession: false, autoRefreshToken: false },
          });

          const { data: lic } = await sb
            .from('licencas')
            .select('id, status')
            .eq('chave', licenseKey)
            .maybeSingle();

          if (!lic || lic.status !== 'ativa') {
            return new Response(JSON.stringify({ ok: false, error: "license_invalid" }), { status: 403, headers: cors });
          }

          // O motorPayload deve ser preservado
          const motorPayload = body.lastPayload ?? body.payload ?? body;

          return new Response(JSON.stringify({ 
            ok: true, 
            status: "fix_stream_ready",
            payload_received: !!motorPayload
          }), { status: 200, headers: cors });

        } catch (error) {
          return new Response(JSON.stringify({ ok: false, error: "internal_error" }), { status: 500, headers: cors });
        }
      }
    }
  }
});
