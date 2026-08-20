import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/download-v17')({
  server: {
    handlers: {
      GET: async () => {
        // Redireciona para o asset permanente
        const assetUrl = 'https://id-preview--219cca7e-5961-4a3d-8913-3023bcbe8103.lovable.app/__l5e/assets-v1/8c42b10a-7b3f-4e92-9387-d1a2c3b4e5f6/mr-central-v17-complete-github.zip';
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
