import { createFileRoute } from '@tanstack/react-router';
import { getCorsHeaders } from '@/lib/mr-ext/ext-api.server';
import { json, resetLicenseDevice } from '@/lib/mr-ext/v175-compat.server';

export const Route = createFileRoute('/api/public/ext/reset-license-hwid')({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: getCorsHeaders(request) }),
      POST: async ({ request }) => {
        const cors = getCorsHeaders(request);
        let body: unknown;
        try { body = await request.json(); } catch { return json({ ok: false, error: 'invalid_json' }, 400, cors); }
        const result = await resetLicenseDevice(body);
        return json(result.data, result.status, cors);
      },
    },
  },
});
