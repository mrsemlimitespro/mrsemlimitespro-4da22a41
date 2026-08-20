import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/download-v17')({
  server: {
    handlers: {
      GET: async () => {
        // Redireciona para o asset permanente usando o ID correto
        const assetUrl = '/__l5e/assets-v1/5eaf0eae-2b4b-4538-a300-6ecbee9e0ba4/mr-central-v17-complete-github.zip';
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
