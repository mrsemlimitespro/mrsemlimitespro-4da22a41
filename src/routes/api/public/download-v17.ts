import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/download-v17')({
  server: {
    handlers: {
      GET: async () => {
        // Redireciona para o asset permanente usando o ID correto
        const assetUrl = '/__l5e/assets-v1/7f0e175e-2ea8-45e5-8347-cf2eca44c200/mr-central-v17-complete-github.zip';
        return new Response(null, {
          status: 302,
          headers: {
            'Location': assetUrl,
            'Cache-Control': 'no-cache'
          }
        });
      }
    }
  }
});
