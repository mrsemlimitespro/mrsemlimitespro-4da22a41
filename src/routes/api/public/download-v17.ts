import { createFileRoute } from '@tanstack/react-router';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export const Route = createFileRoute('/api/public/download-v17')({
  server: {
    handlers: {
      GET: async () => {
        try {
          // Servir o arquivo ZIP local gerado nesta sessão
          const filePath = join(process.cwd(), 'mr-central-v17-complete-final.zip');
          
          if (!existsSync(filePath)) {
            return new Response(JSON.stringify({ 
              error: 'not_found', 
              message: 'O arquivo mr-central-v17-complete-final.zip nao foi encontrado no servidor. Por favor, tente novamente.' 
            }), { 
              status: 404,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          const fileBuffer = readFileSync(filePath);
          
          return new Response(fileBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/zip',
              'Content-Disposition': 'attachment; filename="mr-central-v17-complete-final.zip"',
              'Content-Length': fileBuffer.length.toString(),
              'Cache-Control': 'no-cache'
            }
          });
        } catch (error) {
          console.error('[download-v17] Error:', error);
          return new Response(JSON.stringify({ error: 'internal_error' }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }
  }
});
