import { createFileRoute } from '@tanstack/react-router';
import { normalizeAuth, validateLicense, auditRequest } from '@/lib/mr-ext/ext-api.server';

const getCorsHeaders = (request: Request) => {
  const origin = request.headers.get('Origin');
  const allowedOrigin = process.env.MR_EXTENSION_ORIGIN || 'http://localhost:8080';
  const isAllowed = !process.env.NODE_ENV || process.env.NODE_ENV === 'development' || origin === allowedOrigin;
  return {
    'Access-Control-Allow-Origin': isAllowed ? (origin || '*') : allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
};

export const Route = createFileRoute('/api/ext/send-command')({
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
          '/api/ext/send-command', 
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

        // Extração do payload real do motor preservando a estrutura
        const motorPayload = body.lastPayload ?? body.payload ?? body;

        // Limpeza de metadados internos para a chamada upstream
        const upstreamPayload = { ...motorPayload };
        delete upstreamPayload.license_key;
        delete upstreamPayload.licenseKey;
        delete upstreamPayload.key;
        delete upstreamPayload.chave;
        delete upstreamPayload.hwid;
        delete upstreamPayload.device_id;

        try {
          const upstreamResponse = await fetch(`https://api.lovable.dev/projects/${projectId}/chat`, {
            method: 'POST',
            headers: {
              'Authorization': userToken,
              'Content-Type': 'application/json',
              'Accept': 'text/event-stream, application/json',
            },
            body: JSON.stringify(upstreamPayload),
          });

          const responseHeaders = new Headers(cors);
          const contentType = upstreamResponse.headers.get('Content-Type');
          if (contentType) responseHeaders.set('Content-Type', contentType);

          if (contentType?.includes('text/event-stream')) {
            return new Response(upstreamResponse.body, {
              status: upstreamResponse.status,
              headers: responseHeaders,
            });
          }

          const responseData = await upstreamResponse.text();
          return new Response(responseData, {
            status: upstreamResponse.status,
            headers: responseHeaders,
          });

        } catch (error) {
          console.error('[send-command] Upstream error:', error);
          return new Response(JSON.stringify({ ok: false, error: 'upstream_failed' }), { 
            status: 502, 
            headers: { ...cors, 'Content-Type': 'application/json' } 
          });
        }
      }
    }
  }
});
