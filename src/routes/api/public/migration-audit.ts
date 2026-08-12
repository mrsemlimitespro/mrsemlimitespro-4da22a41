import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/migration-audit')({
  server: {
    handlers: {
      GET: async () => {
        const supabaseUrl = process.env['VITE_SUPABASE_URL'] || process.env['SUPABASE_URL']
        const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

        if (!supabaseUrl || !supabaseKey) {
          return new Response(JSON.stringify({ 
            error: 'Missing credentials', 
            v_url: !!process.env['VITE_SUPABASE_URL'],
            s_url: !!process.env['SUPABASE_URL'],
            s_key: !!process.env['SUPABASE_SERVICE_ROLE_KEY']
          }), { status: 500 })
        }

        const sb = createClient(supabaseUrl, supabaseKey)

        const checkTable = async (table: string) => {
          try {
            const { count, error } = await sb.from(table).select('*', { count: 'exact', head: true })
            return { table, accessible: !error, count: count || 0, error: error?.message }
          } catch (e: any) {
            return { table, accessible: false, count: 0, error: e.message }
          }
        }

        const tables = [
          'ai_prompts', 'ai_agents', 'ai_categories', 'licencas', 
          'licenca_dispositivos', 'produtos', 'premium_packs', 
          'pack_access', 'pack_authorizations', 'revendedores',
          'clientes', 'admin_settings', 'prompt_categories',
          'prompt_favorites', 'prompt_history', 'licencas_eventos'
        ]

        const results = await Promise.all(tables.map(checkTable))

        const { data: prompts } = await sb.from('ai_prompts').select('*')
        const { data: agents } = await sb.from('ai_agents').select('*')
        const { data: produtos } = await sb.from('produtos').select('*')
        
        const { data: buckets, error: storageError } = await sb.storage.listBuckets()

        const inventory: any = { buckets: [] }
        if (buckets) {
           for (const bucket of buckets) {
             const { data: files } = await sb.storage.from(bucket.name).list('', { limit: 100 })
             inventory.buckets.push({ 
               name: bucket.name, 
               fileCount: files?.length || 0, 
               files: files?.map(f => ({ name: f.name, metadata: f.metadata })) 
             })
           }
        }

        return new Response(JSON.stringify({
          database: 'accessible',
          storage: storageError ? 'inaccessible' : 'accessible',
          results,
          prompts,
          agents,
          produtos,
          inventory
        }), {
          headers: {
            'Content-Type': 'application/json'
          }
        })
      }
    }
  }
})
