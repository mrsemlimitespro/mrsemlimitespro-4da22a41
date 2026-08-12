import { createFileRoute } from '@tanstack/react-router'
import { createClient } from "@supabase/supabase-js"

export const Route = createFileRoute('/api/public/homolog-legacy')({
  server: {
    handlers: {
      GET: async () => {
        const LEGACY_URL = process.env['LEGACY_SUPABASE_URL'];
        const LEGACY_KEY = process.env['LEGACY_SUPABASE_SERVICE_ROLE_KEY'];

        if (!LEGACY_URL || !LEGACY_KEY) {
          return new Response(JSON.stringify({ 
            connected: false, 
            error: "Missing credentials",
            env_keys: Object.keys(process.env).filter(k => k.includes('LEGACY'))
          }), { status: 400 });
        }

        try {
          const supabase = createClient(LEGACY_URL, LEGACY_KEY);
          
          // 1. Schema Check
          const { data: tables } = await supabase.rpc('get_tables_info').catch(() => ({ data: null }));
          
          // Se RPC não existir, tentar query direta via postgrest nas tabelas que conhecemos
          const tablesToTest = ['clientes', 'licencas', 'licenca_dispositivos', 'produtos', 'user_roles', 'ai_agents'];
          const tableStatus: Record<string, any> = {};
          
          for (const table of tablesToTest) {
            const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
            tableStatus[table] = error ? 'MISSING' : count;
          }

          // 2. Storage Check
          const { data: buckets } = await supabase.storage.listBuckets();

          // 3. License Analysis (Read Only)
          const { data: licenses } = await supabase.from('licencas').select('status, cliente_id, produto_id, chave');
          const stats = {
            total: licenses?.length || 0,
            ativas: licenses?.filter(l => l.status === 'ativa' || l.status === 'active').length || 0,
            expiradas: licenses?.filter(l => l.status === 'expirada' || l.status === 'expired').length || 0,
            bloqueadas: licenses?.filter(l => l.status === 'bloqueada' || l.status === 'blocked').length || 0,
            revogadas: licenses?.filter(l => l.status === 'revogada' || l.status === 'revoked').length || 0,
            com_cliente: licenses?.filter(l => l.cliente_id).length || 0,
            com_produto: licenses?.filter(l => l.produto_id).length || 0,
          };

          // 4. Duplicate Check (Read Only)
          // Precisamos do cliente atual para comparar, mas como é GET público, vamos apenas retornar os dados do legado
          
          return new Response(JSON.stringify({
            connected: true,
            database: { accessible: true, tables: tableStatus },
            storage: { accessible: true, buckets: buckets?.map(b => b.name) },
            stats: stats,
            licenses_sample: licenses?.slice(0, 5)
          }), { status: 200 });

        } catch (e: any) {
          return new Response(JSON.stringify({ connected: false, error: e.message }), { status: 500 });
        }
      }
    }
  }
})
