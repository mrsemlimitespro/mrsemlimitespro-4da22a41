import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/migration-audit-v2')({
  server: {
    handlers: {
      GET: async () => {
        const supabaseUrl = process.env['VITE_SUPABASE_URL'] || process.env['SUPABASE_URL']
        const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

        if (!supabaseUrl || !supabaseKey) {
          return new Response(JSON.stringify({ error: 'Missing credentials' }), { status: 500 })
        }

        const sb = createClient(supabaseUrl, supabaseKey)

        const fetchAll = async (table: string) => {
          try {
            const { data, error } = await sb.from(table).select('*')
            return { table, data: data || [], count: data?.length || 0, error: error?.message }
          } catch (e: any) {
            return { table, data: [], count: 0, error: e.message }
          }
        }

        const tables = [
          'ai_prompts', 'ai_agents', 'produtos', 'licencas', 
          'licenca_dispositivos', 'premium_packs', 'pack_access', 
          'pack_authorizations', 'revendedores', 'clientes', 
          'admin_settings', 'aulas', 'banners', 'imagens', 'videos',
          'promocoes', 'propagandas', 'carrossel_slides'
        ]

        const results = await Promise.all(tables.map(fetchAll))
        
        const { data: buckets } = await sb.storage.listBuckets()
        const inventory: any[] = []
        if (buckets) {
          for (const b of buckets) {
            const { data: files } = await sb.storage.from(b.name).list('', { limit: 100 })
            inventory.push({
              bucket: b.name,
              files: files?.map(f => ({
                name: f.name,
                id: f.id,
                updated_at: f.updated_at,
                metadata: f.metadata
              })) || []
            })
          }
        }

        return new Response(JSON.stringify({
          database: 'ACESSÍVEL',
          storage: 'ACESSÍVEL',
          entities: results,
          assets: inventory
        }), { headers: { 'Content-Type': 'application/json' } })
      }
    }
  }
})
