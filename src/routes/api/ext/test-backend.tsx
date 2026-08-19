import { createFileRoute } from '@tanstack/react-router';
import { runHomologation } from '@/lib/ext-v17/homolog.server';

export const Route = createFileRoute('/api/ext/test-backend')({
  server: {
    handlers: {
      GET: async () => {
        const result = await runHomologation();
        return new Response(JSON.stringify(result, null, 2), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  }
});
