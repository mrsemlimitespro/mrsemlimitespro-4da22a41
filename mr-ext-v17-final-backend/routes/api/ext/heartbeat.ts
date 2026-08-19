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
    'Content-Type': 'application/json',
  };
};

export const Route = createFileRoute('/api/ext/heartbeat')({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: getCorsHeaders(request) }),
      POST: async ({ request }) => {
        const cors = getCorsHeaders(request);
        let body: any;
        try {
          body = await request.json();
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: 'invalid_json' }), { status: 400, headers: cors });
        }

        const { licenseKey, hwid } = normalizeAuth(body);
        
        if (!licenseKey || !hwid) {
          return new Response(JSON.stringify({ ok: false, error: 'missing_fields' }), { status: 400, headers: cors });
        }

        const result = await validateLicense(licenseKey, hwid);
        
        await auditRequest(
          result.license?.id || null, 
          '/api/ext/heartbeat', 
          'POST', 
          result.valid ? 200 : 403, 
          body
        );

        if (!result.valid) {
          return new Response(JSON.stringify({ ok: false, error: result.error }), { status: 403, headers: cors });
        }

        const lic = result.license!;
        const sess = result.session!;

        return new Response(JSON.stringify({
          ok: true,
          status: lic.status,
          expires_at: lic.expires_at,
          session_id: sess.session_id,
          last_seen: sess.last_seen
        }), { status: 200, headers: cors });
      }
    }
  }
});
