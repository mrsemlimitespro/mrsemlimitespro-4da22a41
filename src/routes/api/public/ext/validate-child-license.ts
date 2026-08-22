import { createFileRoute } from '@tanstack/react-router';
import {
  auditRequest,
  buildExtensionLicenseResponse,
  getCorsHeaders,
  normalizeAuth,
  validateKeyFormat,
  validateLicense,
} from '@/lib/mr-ext/ext-api.server';
import { json } from '@/lib/mr-ext/v175-compat.server';

/**
 * Contrato secundário preservado para a v17.5. No MR, licenças-filhas usam a
 * mesma política de status, expiração e HWID das licenças principais.
 */
export const Route = createFileRoute('/api/public/ext/validate-child-license')({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: getCorsHeaders(request) }),
      POST: async ({ request }) => {
        const cors = getCorsHeaders(request);
        let body: any;
        try { body = await request.json(); } catch { return json({ ok: false, error: 'invalid_json' }, 400, cors); }

        const { licenseKey, hwid } = normalizeAuth(body);
        if (!licenseKey || !hwid) return json({ ok: false, valid: false, error: 'missing_fields' }, 400, cors);
        if (!validateKeyFormat(licenseKey)) return json({ ok: false, valid: false, error: 'invalid_format' }, 400, cors);

        const result = await validateLicense(licenseKey, hwid);
        await auditRequest(result.license?.id || null, '/api/ext/validate-child-license', 'POST', result.valid ? 200 : 403, body);
        if (!result.valid) return json({ ok: false, valid: false, error: result.error }, 403, cors);

        return json(buildExtensionLicenseResponse(result.license!, result.session!, hwid), 200, cors);
      },
    },
  },
});
