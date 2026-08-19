import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/ext/setup-v17")({
  loader: async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Criar Bucket mr-ext-uploads
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    if (!buckets?.find(b => b.id === 'mr-ext-uploads')) {
      await supabaseAdmin.storage.createBucket('mr-ext-uploads', {
        public: false,
        fileSizeLimit: 52428800, // 50MB
      });
    }

    // 2. Criar tabelas necessárias via SQL se não existirem
    // Nota: Como não temos lovable supabase migration direta, 
    // verificamos existência de colunas em 'licencas'
    const { error: licCheck } = await supabaseAdmin.from('licencas').select('license_key').limit(1);
    
    // Se a coluna license_key não existe, precisamos da migration
    // Neste ambiente, as tabelas ext_sessions, ext_requests, ext_uploads devem ser criadas via Lovable Cloud
    // mas vamos garantir as colunas em licencas
    
    return { 
      ok: true, 
      message: "Ambiente de extensão V17 em preparação.",
      next_steps: "Execute a migration SQL no console do Supabase para criar ext_sessions, ext_requests e ext_uploads."
    };
  }
});
