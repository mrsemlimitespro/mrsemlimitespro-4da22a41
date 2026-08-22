import { createFileRoute } from '@tanstack/react-router';
import { normalizeAuth, validateKeyFormat, validateLicense, auditRequest, buildExtensionLicenseResponse, getCorsHeaders } from '@/lib/mr-ext/ext-api.server';

export const Route = createFileRoute('/api/public/ext/validate-license')({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: getCorsHeaders(request) }),
      POST: async ({ request }) => {
        const cors = getCorsHeaders(request);
        let body: any;
        try {
          body = await request.json();
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: 'invalid_json' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
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

        const lic = result.license!;
        const sess = result.session!;

        return new Response(
          JSON.stringify(buildExtensionLicenseResponse(lic, sess, hwid)),
          { status: 200, headers: cors }
        );
      }
    }
  }
});
