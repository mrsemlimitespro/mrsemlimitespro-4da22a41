import { createFileRoute } from '@tanstack/react-router';
import { getCorsHeaders } from '@/lib/mr-ext/ext-api.server';
import { emptySkills, json } from '@/lib/mr-ext/v175-compat.server';

export const Route = createFileRoute('/api/public/ext/get-skills')({
  server: { handlers: {
    OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: getCorsHeaders(request) }),
    POST: async ({ request }) => json(emptySkills(), 200, getCorsHeaders(request)),
  } },
});
