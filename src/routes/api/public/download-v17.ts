import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/download-v17')({
  server: {
    handlers: {
      GET: async () => {
        // Redireciona para o asset permanente
        const assetUrl = 'https://id-preview--219cca7e-5961-4a3d-8913-3023bcbe8103.lovable.app/__l5e/assets-v1/88d4b15d-a8ee-4314-a756-8fdecc0c1de4/mr-ext-v17-final-backend.zip';
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
