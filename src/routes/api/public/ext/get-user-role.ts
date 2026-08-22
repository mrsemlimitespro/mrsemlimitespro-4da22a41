import { createFileRoute } from '@tanstack/react-router';
import { getCorsHeaders } from '@/lib/mr-ext/ext-api.server';
import { json, noResellerRole } from '@/lib/mr-ext/v175-compat.server';

export const Route = createFileRoute('/api/public/ext/get-user-role')({
  server: { handlers: {
    OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: getCorsHeaders(request) }),
    POST: async ({ request }) => json(noResellerRole(), 200, getCorsHeaders(request)),
  } },
});
