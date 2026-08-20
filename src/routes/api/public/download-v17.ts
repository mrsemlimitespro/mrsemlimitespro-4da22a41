import { createFileRoute } from '@tanstack/react-router';
import zipAsset from '../../../../mr-central-v17-complete-final.zip.asset.json';

/**
 * Download do pacote completo MR Central v17.
 * O arquivo vive no CDN de assets (não no filesystem do worker),
 * então redirecionamos para a URL pública do asset.
 */
export const Route = createFileRoute('/api/public/download-v17')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const target = zipAsset.url.startsWith('http')
          ? zipAsset.url
          : `${origin}${zipAsset.url}`;

        return new Response(null, {
          status: 302,
          headers: {
            Location: target,
            'Cache-Control': 'no-store',
          },
        });
      },
    },
  },
});
