import { createFileRoute } from '@tanstack/react-router';
import { validateExtLicense, auditExtRequest } from '@/lib/ext-v17/ext-api.server';

export const Route = createFileRoute('/api/ext/fix-stream')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const licenseKey = body.license_key || body.licenseKey || body.key || body.user_license_key;
          const hwid = body.hwid || body.device_id;
          const userToken = request.headers.get('Authorization');

          if (!licenseKey || !hwid) {
            return new Response(JSON.stringify({ ok: false, error: "missing_auth_metadata" }), { status: 400 });
          }

          const validation = await validateExtLicense(licenseKey, hwid);
          
          if (!validation.ok || !validation.license) {
            return new Response(JSON.stringify({ ok: false, error: validation.error || "license_invalid" }), { status: 403 });
          }

          // Encaminhar para upstream
          const upstreamUrl = 'https://api.lovable.ai/v1/chat/fix-stream'; // Exemplo

          const response = await fetch(upstreamUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': userToken || '',
            },
            body: JSON.stringify(body),
          });

          // Regra crítica: Devolver exatamente o que o upstream devolver
          const contentType = response.headers.get('Content-Type');
          
          if (contentType?.includes('text/event-stream')) {
            return new Response(response.body, {
              status: response.status,
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
              },
            });
          }

          const responseBody = await response.text();
          return new Response(responseBody, {
            status: response.status,
            headers: { 'Content-Type': contentType || 'application/json' },
          });

        } catch (error) {
          return new Response(JSON.stringify({ ok: false, error: "internal_error" }), { status: 500 });
        }
      }
    }
  }
});
