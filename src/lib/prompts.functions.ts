/**
 * Prompts — server function utilizada pelo modal da biblioteca.
 * Adaptado do projeto Link MR Store Pro. Só inclui `getPromptDetail` porque
 * a Etapa 1 restringe migração a leitura pública da biblioteca.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type AiPrompt = {
  id: string;
  numero: number;
  categoria: string;
  subcategoria: string;
  titulo: string;
  descricao: string;
  descricao_completa?: string;
  autor: string;
  prompt: string;
  tags: string[];
  cover_url?: string | null;
  nivel?: string;
  versao?: string;
  status?: string;
  compatibilidade?: string[];
  destaque?: boolean;
  uso_count?: number;
  downloads?: number;
  created_at: string;
  updated_at: string;
};

export const getPromptDetail = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("ai_prompts")
      .select("*")
      .eq("id", data.id)
      .eq("ativo", true)
      .eq("oculto", false)
      .eq("mostrar_premium", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Prompt não encontrado");
    return row as AiPrompt;
  });
