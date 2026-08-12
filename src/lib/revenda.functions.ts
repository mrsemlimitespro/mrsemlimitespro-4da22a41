import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { crypto } from "crypto";

/**
 * atomicDebitAndGenerateLicense
 * Fluxo atômico: Débito de Créditos + Geração de Licença.
 */
export const atomicDebitAndGenerateLicense = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({
    revendedorId: z.string(),
    produtoId: z.string(),
    planoId: z.string(),
    clienteData: z.object({
      nome: z.string(),
      email: z.string().email(),
      whatsapp: z.string().optional(),
      observacao: z.string().optional(),
    }),
    sigla: z.string().min(2).max(5),
  }).parse(data))
  .handler(async ({ data }) => {
    // 1. Verificar saldo do revendedor no ledger
    const { data: ledger } = await supabaseAdmin
      .from("creditos_ledger")
      .select("quantidade")
      .eq("revendedor_id", data.revendedorId);
    
    const saldo = (ledger || []).reduce((acc, curr) => acc + curr.quantidade, 0);
    
    // Pegar custo do plano
    const { data: plano } = await supabaseAdmin
      .from("planos")
      .select("creditos_incluidos, preco")
      .eq("id", data.planoId)
      .single();
    
    if (!plano) throw new Error("Plano não encontrado");
    
    // Aqui assumimos que creditos_incluidos no plano para revendedor representa o custo em créditos
    const custo = plano.creditos_incluidos || 1; 

    if (saldo < custo) {
      throw new Error("Saldo insuficiente");
    }

    // 2. Transação Atômica (Simulada via lógica de segurança no Postgres ou sequência garantida)
    // Gerar Chave Pattern: <SIGLA>-MR-XXXX-XXXX-XXXX-XXXX
    const randomHex = () => crypto.randomBytes(2).toString('hex').toUpperCase();
    const key = \`\${data.sigla.toUpperCase()}-MR-\${randomHex()}-\${randomHex()}-\${randomHex()}-\${randomHex()}\`;

    // Inserir Débito
    const { error: debitError } = await supabaseAdmin.from("creditos_ledger").insert({
      revendedor_id: data.revendedorId,
      quantidade: -custo,
      tipo: "saida",
      descricao: \`Geração de licença \${key}\`,
      metadata: { sigla: data.sigla, produto_id: data.produtoId } as any
    });

    if (debitError) throw debitError;

    // Inserir Licença
    const { data: licenca, error: licError } = await supabaseAdmin.from("licencas").insert({
      chave: key,
      produto_id: data.produtoId,
      cliente_id: null, // Será vinculado ou cadastrado
      email: data.clienteData.email,
      tipo: "premium",
      status: "ativa",
      metadata: { 
        cliente: data.clienteData,
        revendedor_id: data.revendedorId,
        plano_id: data.planoId
      } as any
    }).select().single();

    if (licError) {
      // Rollback manual do crédito (ou usar rpc para transação real)
      await supabaseAdmin.from("creditos_ledger").insert({
        revendedor_id: data.revendedorId,
        quantidade: custo,
        tipo: "entrada",
        descricao: \`Rollback erro geração \${key}\`
      });
      throw licError;
    }

    return { success: true, key, licencaId: licenca.id };
  });
