import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/download-v17')({
  server: {
    handlers: {
      GET: async () => {
        // Redireciona para o pacote final v17 consolidado
        const assetUrl = '/__l5e/assets-v1/04c59ecb-7ba9-466c-9bfe-24c6ecc360cb/mr-central-v17-complete-final.zip';
        
        return new Response(null, {
          status: 302,
          headers: {
            'Location': assetUrl,
            'Cache-Control': 'no-cache',
            'Content-Disposition': 'attachment; filename="mr-central-v17-complete-final.zip"',
            'Content-Type': 'application/zip'
          }
        });
      }
    }
  }
});
