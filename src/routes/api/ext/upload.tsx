import { createFileRoute } from '@tanstack/react-router';
import { validateExtLicense, auditExtRequest } from '@/lib/ext-v17/ext-api.server';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

export const Route = createFileRoute('/api/ext/upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const formData = await request.formData();
          const file = formData.get('file') as File;
          const licenseKey = (formData.get('key') || formData.get('license_key') || formData.get('user_license_key')) as string;
          const hwid = (formData.get('hwid') || formData.get('device_id')) as string;

          if (!file || !licenseKey || !hwid) {
            return new Response(JSON.stringify({ ok: false, error: "missing_fields" }), { status: 400 });
          }

          // 1. Validar Licença e HWID
          const validation = await validateExtLicense(licenseKey, hwid);
          if (!validation.ok || !validation.license) {
            return new Response(JSON.stringify({ ok: false, error: validation.error || "license_invalid" }), { status: 403 });
          }

          // 2. Validar Arquivo
          const allowedMimeTypes = ['image/png', 'image/jpeg', 'application/json', 'text/plain'];
          if (!allowedMimeTypes.includes(file.type)) {
            return new Response(JSON.stringify({ ok: false, error: "invalid_mime_type" }), { status: 400 });
          }

          const MAX_SIZE = 50 * 1024 * 1024; // 50MB
          if (file.size > MAX_SIZE) {
            return new Response(JSON.stringify({ ok: false, error: "file_too_large" }), { status: 400 });
          }

          // 3. Upload para o Storage
          const storagePath = `${validation.license.id}/${crypto.randomUUID()}-${file.name}`;
          const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('mr-ext-uploads')
            .upload(storagePath, file, {
              contentType: file.type,
              upsert: false
            });

          if (uploadError) {
            console.error("[upload] Storage error:", uploadError);
            return new Response(JSON.stringify({ ok: false, error: "storage_error" }), { status: 500 });
          }

          // 4. Registrar em ext_uploads
          const { error: dbError } = await supabaseAdmin.from('ext_uploads').insert({
            license_id: validation.license.id,
            original_name: file.name,
            storage_key: storagePath,
            mime_type: file.type,
            size_bytes: file.size
          });

          // 5. Gerar URL assinada (opcional ou conforme solicitado)
          const { data: signedUrl } = await supabaseAdmin.storage
            .from('mr-ext-uploads')
            .createSignedUrl(storagePath, 3600); // 1 hora

          return new Response(JSON.stringify({
            ok: true,
            url: signedUrl?.signedUrl,
            file_path: storagePath,
            licenca_id: validation.license.id
          }), { status: 200 });

        } catch (error) {
          console.error("[upload] Error:", error);
          return new Response(JSON.stringify({ ok: false, error: "internal_error" }), { status: 500 });
        }
      }
    }
  }
});
