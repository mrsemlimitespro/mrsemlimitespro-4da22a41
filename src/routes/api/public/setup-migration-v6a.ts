import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { createServerFn } from '@tanstack/react-start';

const migrationSchema = z.object({
  prompts: z.array(z.any()),
  agents: z.array(z.any()),
});

const executeMigration = createServerFn({ method: 'POST' })
  .inputValidator((data) => migrationSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    
    const results = {
      prompts: { total: data.prompts.length, migrated: 0, conflicts: 0 },
      agents: { total: data.agents.length, migrated: 0, conflicts: 0 },
    };

    // Migrar Prompts
    for (const p of data.prompts) {
      const { data: existing } = await supabaseAdmin
        .from('ai_prompts')
        .select('id')
        .or(`legacy_id.eq."${p.id}",titulo.eq."${p.titulo}"`)
        .maybeSingle();

      if (existing) {
        results.prompts.conflicts++;
        continue;
      }

      const { error } = await supabaseAdmin.from('ai_prompts').insert({
        legacy_id: p.id,
        titulo: p.titulo,
        descricao: p.descricao,
        prompt: p.prompt || p.content || '',
        categoria: p.categoria,
        tags: p.tags,
        cover_url: p.cover_url,
        ativo: p.ativo ?? true,
        oculto: p.oculto ?? false,
        destaque: p.destaque ?? false,
        nivel: p.nivel,
        versao: p.versao,
        compatibilidade: p.compatibilidade,
        numero: p.numero,
        metadata: {
            autor: p.autor,
            status: p.status,
            ...p.metadata
        }
      } as any);

      if (!error) results.prompts.migrated++;
    }

    // Migrar Agentes
    for (const a of data.agents) {
      const { data: existing } = await supabaseAdmin
        .from('ai_agents')
        .select('id')
        .or(`legacy_id.eq."${a.id}",titulo.eq."${a.titulo}"`)
        .maybeSingle();

      if (existing) {
        results.agents.conflicts++;
        continue;
      }

      const { error } = await supabaseAdmin.from('ai_agents').insert({
        legacy_id: a.id,
        titulo: a.titulo,
        descricao: a.descricao,
        descricao_completa: a.descricao_completa,
        system_prompt: a.system_prompt || '',
        instrucoes: a.instrucoes,
        categoria: a.categoria,
        subcategoria: a.subcategoria,
        tags: a.tags,
        capabilities: a.capabilities,
        tools: a.tools,
        compatibilidade: a.compatibilidade,
        autor: a.autor,
        versao: a.versao,
        temperatura: a.temperatura,
        max_tokens: a.max_tokens,
        cover_url: a.cover_url,
        ativo: a.ativo ?? true,
        oculto: a.oculto ?? false,
        destaque: a.destaque ?? false,
        modelo: a.modelo,
        provedor: a.provedor,
        nivel: a.nivel,
        numero: a.numero
      } as any);

      if (!error) results.agents.migrated++;
    }

    return results;
  });

export const Route = createFileRoute('/api/public/setup-migration-v6a')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const results = await executeMigration({ data: body });
          return new Response(JSON.stringify(results), { status: 200 });
        } catch (e: any) {
          return new Response(e.message, { status: 500 });
        }
      }
    }
  }
});


export const Route = createFileRoute('/api/public/setup-migration-v6a')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const results = await executeMigration({ data: body });
          return new Response(JSON.stringify(results), { status: 200 });
        } catch (e: any) {
          return new Response(e.message, { status: 500 });
        }
      }
    }
  }
});
