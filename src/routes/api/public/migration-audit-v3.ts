import { createFileRoute } from '@tanstack/react-router'
import { runAudit } from '@/lib/audit.server'

export const Route = createFileRoute('/api/public/migration-audit-v3')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const result = await runAudit()
          return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
        }
      }
    }
  }
})
