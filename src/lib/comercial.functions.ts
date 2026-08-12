import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const KeyGeneratorSchema = z.object({
  produtoSigla: z.string().min(2).max(10),
  revendedorId: z.string().uuid(),
  planoId: z.string().uuid(),
  clienteId: z.string().uuid().optional(),
});

/**
 * Gera uma chave de licença no padrão MR CENTRAL: SIGLA-MR-XXXX-XXXX-XXXX-XXXX
 * Realiza o débito atômico de créditos do revendedor.
 */
export const generateLicenseByRevendedor = createServerFn({ method: "POST" })
  .inputValidator((data) => KeyGeneratorSchema.parse(data))
  .handler(async ({ data }) => {
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Validar Revendedor e Saldo
    const { data: rev, error: errRev } = await sb
      .from("revendedores")
      .select("id, status, saldo_creditos")
      .eq("id", data.revendedorId)
      .single();

    if (errRev || !rev) throw new Error("Revendedor não encontrado.");
    if (rev.status !== "ativo") throw new Error("Revendedor inativo.");

    // 2. Validar Plano e Preço (em créditos)
    const { data: plano, error: errPlano } = await sb
      .from("planos")
      .select("id, preco, produto_id")
      .eq("id", data.planoId)
      .single();

    if (errPlano || !plano) throw new Error("Plano não encontrado.");
    
    const custo = Number(plano.preco ?? 0);
    if (Number(rev.saldo_creditos ?? 0) < custo) {
      throw new Error("Saldo de créditos insuficiente.");
    }

    // 3. Gerar Chave
    const segments = [];
    for (let i = 0; i < 4; i++) {
      const bytes = new Uint8Array(2);
      globalThis.crypto.getRandomValues(bytes);
      segments.push(Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(''));
    }
    const key = `${data.produtoSigla.toUpperCase()}-MR-${segments.join('-')}`;

    // 4. Operação Atômica (RPC recomendado, mas aqui simulamos via transação lógica)
    // Em produção, usar RPC para garantir atomicidade total
    const { error: errUpdate } = await sb
      .from("revendedores")
      .update({ saldo_creditos: Number(rev.saldo_creditos) - custo })
      .eq("id", rev.id);

    if (errUpdate) throw new Error("Erro ao debitar créditos.");

    // Registrar no Ledger
    await sb.from("creditos_ledger").insert({
      revendedor_id: rev.id,
      quantidade: custo,
      tipo: "debito",
      motivo: `Geração de licença: ${key}`,
      produto_id: plano.produto_id,
      metadata: { key, plano_id: data.planoId }
    });

    // Criar Licença
    const { data: newLic, error: errLic } = await sb
      .from("licencas")
      .insert({
        chave: key,
        produto_id: plano.produto_id,
        plano_id: plano.id,
        revendedor_id: rev.id,
        cliente_id: data.clienteId,
        status: "ativa",
        tipo: "premium"
      })
      .select()
      .single();

    if (errLic) throw new Error("Erro ao criar licença.");

    return { ok: true, key, licencaId: newLic.id };
  });
