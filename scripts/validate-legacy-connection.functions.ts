import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const validateLegacyConnection = createServerFn({ method: "POST" })
  .handler(async () => {
    const LEGACY_URL = process.env['LEGACY_SUPABASE_URL'];
    const LEGACY_KEY = process.env['LEGACY_SUPABASE_SERVICE_ROLE_KEY'];

    if (!LEGACY_URL || !LEGACY_KEY) {
      return {
        connected: false,
        error: "Missing legacy credentials",
        env: {
            url: !!LEGACY_URL,
            key: !!LEGACY_KEY
        }
      };
    }

    try {
      const supabase = createClient(LEGACY_URL, LEGACY_KEY);
      
      // 1. Validar Database
      const { data: tables, error: dbError } = await supabase
        .from('pg_catalog.pg_tables')
        .select('tablename')
        .eq('schemaname', 'public');

      // 2. Validar Storage
      const { data: buckets, error: storageError } = await supabase.storage.listBuckets();

      return {
        connected: true,
        database: {
          accessible: !dbError,
          tables: tables?.map(t => t.tablename) || [],
          error: dbError?.message
        },
        storage: {
          accessible: !storageError,
          buckets: buckets?.map(b => b.name) || [],
          error: storageError?.message
        }
      };
    } catch (e: any) {
      return { connected: false, error: e.message };
    }
  });

export const getLegacyCounts = createServerFn({ method: "POST" })
  .handler(async () => {
     const LEGACY_URL = process.env['LEGACY_SUPABASE_URL'];
     const LEGACY_KEY = process.env['LEGACY_SUPABASE_SERVICE_ROLE_KEY'];
     if (!LEGACY_URL || !LEGACY_KEY) throw new Error("Missing legacy credentials");
     
     const supabase = createClient(LEGACY_URL, LEGACY_KEY);
     
     // Tentativa de mapeamento de tabelas (baseado na auditoria master)
     const queries = {
         clientes: supabase.from('clientes').select('*', { count: 'exact', head: true }),
         licencas: supabase.from('licencas').select('*', { count: 'exact', head: true }),
         dispositivos: supabase.from('licenca_dispositivos').select('*', { count: 'exact', head: true }),
         produtos: supabase.from('produtos').select('*', { count: 'exact', head: true }),
         licencas_stats: supabase.from('licencas').select('status')
     };

     const results = await Promise.allSettled(Object.values(queries));
     
     return {
         clientes: results[0].status === 'fulfilled' ? (results[0].value as any).count : 'NÃO IDENTIFICADO',
         licencas: results[1].status === 'fulfilled' ? (results[1].value as any).count : 'NÃO IDENTIFICADO',
         dispositivos: results[2].status === 'fulfilled' ? (results[2].value as any).count : 'NÃO IDENTIFICADO',
         produtos: results[3].status === 'fulfilled' ? (results[3].value as any).count : 'NÃO IDENTIFICADO',
         licencas_raw: results[4].status === 'fulfilled' ? (results[4].value as any).data : []
     };
  });
