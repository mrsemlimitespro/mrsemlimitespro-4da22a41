import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { normalizeAuth, validateLicense, auditRequest } from '@/lib/mr-ext/ext-api.server';

const getCorsHeaders = (request: Request) => {
  const origin = request.headers.get('Origin');
  const allowedOrigin = process.env.MR_EXTENSION_ORIGIN || 'http://localhost:8080';
  const isAllowed = process.env.NODE_ENV === 'development' || origin === allowedOrigin;
  return {
    'Access-Control-Allow-Origin': isAllowed ? (origin || '*') : allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
};

const ALLOWED_MIMES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain', 'text/csv', 'text/markdown',
  'application/json',
  'application/zip', 'application/x-zip-compressed',
  'audio/mpeg', 'audio/wav', 'audio/ogg',
  'video/mp4', 'video/webm', 'video/ogg'
];

export const Route = createFileRoute('/api/ext/upload')({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: getCorsHeaders(request) }),
      POST: async ({ request }) => {
        const cors = getCorsHeaders(request);
        let formData: FormData;
        try {
          formData = await request.formData();
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: 'invalid_form_data' }), { 
            status: 400, 
            headers: { ...cors, 'Content-Type': 'application/json' } 
          });
        }

        const file = formData.get('file') as File;
        const { licenseKey, hwid } = normalizeAuth(Object.fromEntries(formData.entries()));

        if (!file || !licenseKey || !hwid) {
          return new Response(JSON.stringify({ ok: false, error: 'missing_fields' }), { 
            status: 400, 
            headers: { ...cors, 'Content-Type': 'application/json' } 
          });
        }

        const result = await validateLicense(licenseKey, hwid);
        
        await auditRequest(
          result.license?.id || null, 
          '/api/ext/upload', 
          'POST', 
          result.valid ? 200 : 403, 
          { filename: file.name, size: file.size, type: file.type }
        );

        if (!result.valid) {
          return new Response(JSON.stringify({ ok: false, error: result.error }), { 
            status: 403, 
            headers: { ...cors, 'Content-Type': 'application/json' } 
          });
        }

        // Validação de Tamanho (50MB)
        if (file.size > 50 * 1024 * 1024) {
          return new Response(JSON.stringify({ ok: false, error: 'file_too_large' }), { 
            status: 400, 
            headers: { ...cors, 'Content-Type': 'application/json' } 
          });
        }

        // Validação de MIME
        if (!ALLOWED_MIMES.includes(file.type)) {
          return new Response(JSON.stringify({ ok: false, error: 'invalid_mime_type' }), { 
            status: 400, 
            headers: { ...cors, 'Content-Type': 'application/json' } 
          });
        }

        const lic = result.license!;
        const fileExt = file.name.split('.').pop();
        const sanitizedName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const storageKey = `${lic.id}/${crypto.randomUUID()}-${sanitizedName}`;

        try {
          const { error: uploadErr } = await supabaseAdmin.storage
            .from('mr-ext-uploads')
            .upload(storageKey, file, {
              contentType: file.type,
              upsert: false
            });

          if (uploadErr) throw uploadErr;

          const { data: uploadRecord, error: dbErr } = await supabaseAdmin
            .from('ext_uploads')
            .insert({
              license_id: lic.id,
              original_name: file.name,
              storage_key: storageKey,
              mime_type: file.type,
              size_bytes: file.size
            })
            .select()
            .single();

          if (dbErr) throw dbErr;

          // Gerar URL assinada (válida por 1 hora)
          const { data: signedUrlData, error: signErr } = await supabaseAdmin.storage
            .from('mr-ext-uploads')
            .createSignedUrl(storageKey, 3600);

          if (signErr) throw signErr;

          return new Response(JSON.stringify({
            ok: true,
            url: signedUrlData.signedUrl,
            file_path: storageKey,
            licenca_id: lic.id
          }), { 
            status: 200, 
            headers: { ...cors, 'Content-Type': 'application/json' } 
          });

        } catch (error) {
          console.error('[upload] Failed:', error);
          return new Response(JSON.stringify({ ok: false, error: 'upload_failed' }), { 
            status: 500, 
            headers: { ...cors, 'Content-Type': 'application/json' } 
          });
        }
      }
    }
  }
});
