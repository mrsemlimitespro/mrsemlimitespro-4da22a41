import { createFileRoute } from '@tanstack/react-router';
import { getCorsHeaders } from '@/lib/mr-ext/ext-api.server';
import { json, noLicenseUser } from '@/lib/mr-ext/v175-compat.server';

export const Route = createFileRoute('/api/public/ext/get-license-user')({
  server: { handlers: {
    OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: getCorsHeaders(request) }),
    POST: async ({ request }) => json(noLicenseUser(), 200, getCorsHeaders(request)),
  } },
});
