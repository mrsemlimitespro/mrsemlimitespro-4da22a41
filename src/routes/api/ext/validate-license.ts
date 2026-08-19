import { createFileRoute } from '@tanstack/react-router';
import { normalizeAuth, validateKeyFormat, validateLicense, auditRequest } from '@/lib/mr-ext/ext-api.server';

const getCorsHeaders = (request: Request) => {
  const origin = request.headers.get('Origin');
  const allowedOrigin = process.env.MR_EXTENSION_ORIGIN || 'http://localhost:8080';
  
  // Em produção, restringir ao ID da extensão oficial se configurado
  const isAllowed = !process.env.NODE_ENV || process.env.NODE_ENV === 'development' || origin === allowedOrigin;
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? (origin || '*') : allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
};

export const Route = createFileRoute('/api/ext/validate-license')({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 240, headers: getCorsHeaders(request) }),
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

        if (!validateKeyFormat(licenseKey)) {
          return new Response(JSON.stringify({ ok: false, error: 'invalid_format' }), { status: 400, headers: cors });
        }

        const result = await validateLicense(licenseKey, hwid);
        
        await auditRequest(
          result.license?.id || null, 
          '/api/ext/validate-license', 
          'POST', 
          result.valid ? 200 : 403, 
          body
        );

        if (!result.valid) {
          return new Response(JSON.stringify({ ok: false, error: result.error }), { status: 403, headers: cors });
        }

        return new Response(JSON.stringify({
          ok: true,
          valid: true,
          licenca_id: result.license.id,
          license_key: result.license.license_key,
          user_name: result.license.user_name,
          status: result.license.status,
          expires_at: result.license.expires_at,
          hwid: hwid,
          session_id: result.session.session_id,
          max_devices: result.license.max_devices
        }), { status: 200, headers: cors });
      }
    }
  }
});
