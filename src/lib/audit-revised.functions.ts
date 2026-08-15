import { supabase } from "@/integrations/supabase/client";
import { createServerFn } from "@tanstack/react-start";

export const runAudit = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      // Usando query direta via RPC se disponível ou simulando via tabelas conhecidas
      // Mas a melhor forma de ler o information_schema em uma conexão segura é via admin,
      // porém aqui usaremos o client padrão para ver o que ele enxerga.
      
      const { data: tables, error: tableError } = await supabase
        .from('information_schema.tables' as any)
        .select('tablename')
        .eq('schemaname', 'public')
        .in('tablename', ['tenants', 'tenant_members', 'whatsapp_instances', 'leads', 'campanhas']);

      const { data: policies, error: policyError } = await supabase
        .from('pg_policies' as any)
        .select('tablename, policyname, cmd')
        .eq('schemaname', 'public')
        .in('tablename', ['tenants', 'tenant_members', 'whatsapp_instances', 'leads', 'campanhas']);

      return {
        tables: tables || [],
        policies: policies || [],
        tableError,
        policyError
      };
    } catch (e: any) {
      return { error: e.message };
    }
  });
