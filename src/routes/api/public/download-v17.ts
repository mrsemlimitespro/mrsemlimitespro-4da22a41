import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/download-v17')({
  server: {
    handlers: {
      GET: async () => {
        // Redireciona para o asset permanente usando o ID correto
        const assetUrl = '/__l5e/assets-v1/8c42b10a-7b3f-4e92-9387-d1a2c3b4e5f6/mr-central-v17-complete-github.zip';
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
