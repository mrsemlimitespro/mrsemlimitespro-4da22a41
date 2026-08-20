import { createFileRoute } from '@tanstack/react-router';
import { normalizeAuth, validateLicense, auditRequest, getCorsHeaders } from '@/lib/mr-ext/ext-api.server';

export const Route = createFileRoute('/api/public/ext/fix-stream')({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: getCorsHeaders(request) }),
      POST: async ({ request }) => {
        const cors = getCorsHeaders(request);
        let body: any;
        try {
          body = await request.json();
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: 'invalid_json' }), { 
            status: 400, 
            headers: { ...cors, 'Content-Type': 'application/json' } 
          });
        }

        const { licenseKey, hwid } = normalizeAuth(body);
        const userToken = request.headers.get('Authorization');
        const projectId = body.projectId || body.project_id;

        if (!licenseKey || !hwid || !userToken || !projectId) {
          return new Response(JSON.stringify({ ok: false, error: 'missing_fields' }), { 
            status: 400, 
            headers: { ...cors, 'Content-Type': 'application/json' } 
          });
        }

        const result = await validateLicense(licenseKey, hwid);
        
        await auditRequest(
          result.license?.id || null, 
          '/api/ext/fix-stream', 
          'POST', 
          result.valid ? 200 : 403, 
          body
        );

        if (!result.valid) {
          return new Response(JSON.stringify({ ok: false, error: result.error }), { 
            status: 403, 
            headers: { ...cors, 'Content-Type': 'application/json' } 
          });
        }

        const motorPayload = body.lastPayload ?? body.payload ?? body;
        
        try {
          const upstreamResponse = await fetch(`https://api.lovable.dev/projects/${projectId}/chat`, {
            method: 'POST',
            headers: {
              'Authorization': userToken,
              'Content-Type': 'application/json',
              'Accept': 'text/event-stream',
            },
            body: JSON.stringify(motorPayload),
          });

          // Regra obrigatória: Repassar erros do upstream
          if (!upstreamResponse.ok) {
            const errText = await upstreamResponse.text();
            return new Response(errText, {
              status: upstreamResponse.status,
              headers: { ...cors, 'Content-Type': upstreamResponse.headers.get('Content-Type') || 'application/json' }
            });
          }

          const responseHeaders = new Headers(cors);
          const contentType = upstreamResponse.headers.get('Content-Type');
          if (contentType) responseHeaders.set('Content-Type', contentType);

          return new Response(upstreamResponse.body, {
            status: upstreamResponse.status,
            headers: responseHeaders,
          });

        } catch (error) {
          return new Response(JSON.stringify({ ok: false, error: 'upstream_failed' }), { 
            status: 502, 
            headers: { ...cors, 'Content-Type': 'application/json' } 
          });
        }
      }
    }
  }
});
