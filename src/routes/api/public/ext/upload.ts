import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization',
};

export const Route = createFileRoute('/api/public/ext/upload')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        try {
          const formData = await request.formData();
          const file = formData.get('file') as File;
          const licenseKey = (formData.get('key') || formData.get('license_key') || formData.get('user_license_key')) as string;
          const hwid = (formData.get('hwid') || formData.get('device_id')) as string;

          if (!file || !licenseKey || !hwid) {
            return new Response(JSON.stringify({ ok: false, error: "missing_fields" }), { 
              status: 400, 
              headers: { ...cors, 'content-type': 'application/json' } 
            });
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
            return new Response(JSON.stringify({ ok: false, error: "license_invalid" }), { 
              status: 403, 
              headers: { ...cors, 'content-type': 'application/json' } 
            });
          }

          // TODO: Implementar upload real para o bucket mr-ext-uploads
          // Por enquanto, esta rota é um placeholder funcional para a auditoria de transportes.
          
          return new Response(JSON.stringify({ 
            ok: true, 
            message: "Upload simulado com sucesso",
            file_name: file.name,
            size: file.size
          }), { 
            status: 200, 
            headers: { ...cors, 'content-type': 'application/json' } 
          });

        } catch (error) {
          return new Response(JSON.stringify({ ok: false, error: "internal_error" }), { 
            status: 500, 
            headers: { ...cors, 'content-type': 'application/json' } 
          });
        }
      }
    }
  }
});
