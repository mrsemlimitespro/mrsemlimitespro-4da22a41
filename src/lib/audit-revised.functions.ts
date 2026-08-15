import { supabase } from "@/integrations/supabase/client";
import { createServerFn } from "@tanstack/react-start";

export const runAudit = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      // Usando o client do frontend mas executando no server.
      // Information schema e pg_policies não costumam ser expostas no PostgREST 
      // padrão por segurança, mas vamos tentar ler metadados se houver views.
      
      const tablesToCheck = ['tenants', 'tenant_members', 'whatsapp_instances', 'leads', 'campanhas'];
      
      // Tentativa de verificar existência via queries simples (se falhar 404/403, pode indicar existência ou não)
      const auditResults = await Promise.all(tablesToCheck.map(async (table) => {
        const { error } = await supabase.from(table).select('*', { count: 'exact', head: true }).limit(1);
        return { table, status: error ? error.code : 'exists', message: error ? error.message : 'Table accessible' };
      }));

      return {
        auditResults,
        timestamp: new Date().toISOString()
      };
    } catch (e: any) {
      return { error: String(e.message || e) };
    }
  });
