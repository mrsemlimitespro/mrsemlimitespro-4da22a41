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
            error: 'Missing credentials'
          }), { status: 500 })
        }

        const sb = createClient(supabaseUrl, supabaseKey)

        // List all tables from information_schema
        const { data: tablesData, error: tablesError } = await sb.rpc('get_tables_audit', {})
        
        // If RPC doesn't exist, we'll try a raw select or list known tables
        let tables_list: any[] = []
        if (tablesError) {
           // Fallback attempt to query directly
           const { data: schemaTables } = await sb.from('pg_tables' as any).select('tablename').eq('schemaname', 'public')
           tables_list = schemaTables || []
        } else {
           tables_list = tablesData || []
        }

        const checkTable = async (table: string) => {
          try {
            const { count, error } = await sb.from(table).select('*', { count: 'exact', head: true })
            return { table, accessible: !error, count: count || 0, error: error?.message }
          } catch (e: any) {
            return { table, accessible: false, count: 0, error: e.message }
          }
        }

        const known_tables = [
          'ai_prompts', 'ai_agents', 'ai_categories', 'licencas', 
          'licenca_dispositivos', 'produtos', 'premium_packs', 
          'pack_access', 'pack_authorizations', 'revendedores',
          'clientes', 'admin_settings', 'prompt_categories',
          'prompt_favorites', 'prompt_history', 'licencas_eventos'
        ]

        const results = await Promise.all(known_tables.map(checkTable))

        const { data: prompts } = await sb.from('ai_prompts').select('*')
        const { data: agents } = await sb.from('ai_agents').select('*')
        const { data: produtos } = await sb.from('produtos').select('*')
        const { data: licencas } = await sb.from('licencas').select('*')
        const { data: dispositivos } = await sb.from('licenca_dispositivos').select('*')
        const { data: premium_packs } = await sb.from('premium_packs').select('*')
        
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
          tables_found: tables_list,
          results,
          prompts,
          agents,
          produtos,
          licencas,
          dispositivos,
          premium_packs,
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
