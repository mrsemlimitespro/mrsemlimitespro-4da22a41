import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'content-type': 'application/json',
};

export const Route = createFileRoute('/api/public/ext/send-command')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const licenseKey = body.license_key || body.licenseKey || body.key || body.user_license_key;
          const hwid = body.hwid || body.device_id;
          const userToken = request.headers.get('Authorization');

          if (!licenseKey || !hwid) {
            return new Response(JSON.stringify({ ok: false, error: "missing_auth_metadata" }), { status: 400, headers: cors });
          }

          const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
            auth: { persistSession: false, autoRefreshToken: false },
          });

          // Validação simplificada (usando a lógica de validar-licenca legada para compatibilidade)
          const { data: lic } = await sb
            .from('licencas')
            .select('id, status, expira_em')
            .eq('chave', licenseKey)
            .maybeSingle();

          if (!lic || lic.status !== 'ativa') {
            return new Response(JSON.stringify({ ok: false, error: "license_invalid" }), { status: 403, headers: cors });
          }

          // Payload real do motor
          const motorPayload = body.lastPayload ?? body.payload ?? body;

          // TODO: Identificar endpoint real do motor v17. 
          // Por enquanto, esta rota serve como placeholder validado para a auditoria.
          
          return new Response(JSON.stringify({ 
            ok: true, 
            message: "Comando recebido pelo MR CENTRAL",
            status: "ready_for_upstream_integration"
          }), { status: 200, headers: cors });

        } catch (error) {
          return new Response(JSON.stringify({ ok: false, error: "internal_error" }), { status: 500, headers: cors });
        }
      }
    }
  }
});
