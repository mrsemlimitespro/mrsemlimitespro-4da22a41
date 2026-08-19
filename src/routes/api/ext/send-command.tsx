import { createFileRoute } from '@tanstack/react-router';
import { validateExtLicense, auditExtRequest } from '@/lib/ext-v17/ext-api.server';

export const Route = createFileRoute('/api/ext/send-command')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // 1. Extrair metadados para validação da licença
          const body = await request.json();
          const licenseKey = body.license_key || body.licenseKey || body.key || body.user_license_key;
          const hwid = body.hwid || body.device_id;
          const userToken = request.headers.get('Authorization');

          if (!licenseKey || !hwid) {
            return new Response(JSON.stringify({ ok: false, error: "missing_auth_metadata" }), { status: 400 });
          }

          // 2. Validar Licença e HWID
          const validation = await validateExtLicense(licenseKey, hwid);
          
          // Auditoria sanitizada prévia (antes de enviar ao upstream)
          await auditExtRequest(
            validation.ok && validation.license ? validation.license.id : null,
            '/api/ext/send-command',
            'POST',
            validation.ok ? 200 : 403,
            body
          );

          if (!validation.ok || !validation.license) {
            return new Response(JSON.stringify({ ok: false, error: validation.error || "license_invalid" }), { status: 403 });
          }

          if (!userToken) {
            return new Response(JSON.stringify({ ok: false, error: "missing_user_token" }), { status: 401 });
          }

          // 3. Preparar Payload Upstream
          // "Usar exatamente: const motorPayload = body.lastPayload ?? body.payload ?? body;"
          const motorPayload = body.lastPayload ?? body.payload ?? body;

          // 4. Chamada Upstream para Lovable API
          // Nota: O endpoint real da Lovable API é privado. Usamos o token do usuário.
          const upstreamUrl = 'https://api.lovable.ai/v1/chat/completions'; // Exemplo, deve seguir a convenção interna

          const response = await fetch(upstreamUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': userToken,
            },
            body: JSON.stringify(motorPayload),
          });

          // 5. Repassar Resposta Integralmente
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
          console.error("[send-command] Error:", error);
          return new Response(JSON.stringify({ ok: false, error: "upstream_error" }), { status: 500 });
        }
      }
    }
  }
});
