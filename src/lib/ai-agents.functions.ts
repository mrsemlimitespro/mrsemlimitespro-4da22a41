/**
 * AI Agents — server functions (leitura pública).
 * Copiado do projeto Link MR Store Pro. Schema idêntico no MR Sem Limites,
 * então nenhuma adaptação de colunas é necessária.
 *
 * Etapa 2: só migramos leitura pública (`getAgents`). Admin/CRUD ficam
 * fora do escopo desta migração conforme instruções do usuário.
 */
import { createServerFn } from "@tanstack/react-start";

export type AiAgent = {
  id: string;
  numero: number;
  categoria: string;
  subcategoria: string;
  titulo: string;
  descricao: string;
  descricao_completa: string;
  system_prompt: string;
  instrucoes: string;
  modelo: string;
  provedor: string;
  temperatura: number;
  max_tokens: number;
  capabilities: string[];
  tools: string[];
  tags: string[];
  compatibilidade: string[];
  autor: string;
  nivel: string;
  versao: string;
  cover_url: string | null;
  ativo: boolean;
  oculto: boolean;
  destaque: boolean;
  visible_mobile: boolean;
  uso_count: number;
  created_at: string;
  updated_at: string;
};

export const AGENT_CATEGORIES = [
  "Atendimento",
  "Vendas",
  "Marketing",
  "Suporte",
  "Conteúdo",
  "Produtividade",
  "Educação",
  "Pesquisa",
  "Programação",
  "Design",
  "Análise de Dados",
  "RH",
  "Financeiro",
  "Jurídico",
  "Outros",
] as const;

export const getAgents = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("ai_agents")
    .select(
      "id,numero,titulo,descricao,descricao_completa,system_prompt,instrucoes,categoria,subcategoria,tags,capabilities,tools,compatibilidade,autor,versao,temperatura,max_tokens,cover_url,destaque,ativo,oculto,modelo,provedor,nivel,uso_count,created_at,updated_at",
    )
    .eq("ativo", true)
    .eq("oculto", false)
    .order("numero", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as AiAgent[];
});
