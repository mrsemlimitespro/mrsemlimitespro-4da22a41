import { createFileRoute } from '@tanstack/react-router';
import { getCorsHeaders } from '@/lib/mr-ext/ext-api.server';
import { emptyNotifications, json } from '@/lib/mr-ext/v175-compat.server';

export const Route = createFileRoute('/api/public/ext/get-notifications')({
  server: { handlers: {
    OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: getCorsHeaders(request) }),
    GET: async ({ request }) => json(emptyNotifications(), 200, getCorsHeaders(request)),
  } },
});
