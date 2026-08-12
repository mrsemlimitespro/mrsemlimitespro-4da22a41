import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/debug-env')({
  server: {
    handlers: {
      GET: async () => {
        return new Response(JSON.stringify({ 
          all_keys: Object.keys(process.env).filter(k => !k.includes('KEY') && !k.includes('SECRET') && !k.includes('TOKEN')),
          legacy_keys: Object.keys(process.env).filter(k => k.includes('LEGACY'))
        }), { status: 200 });
      }
    }
  }
})
