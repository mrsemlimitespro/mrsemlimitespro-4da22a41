import { createClient } from '@supabase/supabase-js'

export async function runAudit() {
  const supabaseUrl = process.env['VITE_SUPABASE_URL'] || process.env['SUPABASE_URL']
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials in environment')
  }

  const sb = createClient(supabaseUrl, supabaseKey)

  const fetchTable = async (table: string) => {
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

  const entities = await Promise.all(tables.map(fetchTable))
  
  const { data: buckets } = await sb.storage.listBuckets()
  const assets: any[] = []
  if (buckets) {
    for (const b of buckets) {
      const { data: files } = await sb.storage.from(b.name).list('', { limit: 100 })
      assets.push({
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

  return {
    database: 'ACESSÍVEL',
    storage: 'ACESSÍVEL',
    entities,
    assets
  }
}
