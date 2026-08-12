import { createClient } from "@supabase/supabase-js";
import { Database } from "@/integrations/supabase/types";

type Json = Database['public']['Tables']['payment_transactions']['Row']['metadata'];

/**
 * Motor de Fulfillment Idempotente do MR CENTRAL V2.
 */
export async function executeFulfillment(params: {
  transactionId: string;
  orderId?: string;
}) {
  const sb = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Localizar Transação e Pedido
  const { data: txn, error: errTxn } = await sb
    .from("payment_transactions")
    .select("*, plano:planos(*, produto:produtos(*)), pack:creditos_packs(*), cliente:clientes(*)")
    .eq("id", params.transactionId)
    .single();

  if (errTxn || !txn) throw new Error("Transação não encontrada.");

  // Se já foi processada, ignorar (idempotência)
  if (txn.metadata && (txn.metadata as any).fulfilled_at) {
    return { ok: true, already_fulfilled: true };
  }

  // Só processa se aprovado
  if (txn.status !== "aprovado") {
    return { ok: false, reason: "transaction-not-approved" };
  }

  try {
    let result: any = null;

    // Caso A: Compra de Plano / Extensão (Geração de Licença)
    if (txn.plano_id) {
      const plano = txn.plano as any;
      const produto = plano?.produto;
      if (!produto) throw new Error("Produto do plano não encontrado.");

      // Motor de geração de chave CSPRNG
      const segments = [];
      for (let i = 0; i < 4; i++) {
        const bytes = new Uint8Array(2);
        globalThis.crypto.getRandomValues(bytes);
        segments.push(Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(''));
      }
      const sigla = produto.sigla || produto.slug?.substring(0, 3).toUpperCase() || "MR";
      const key = `${sigla}-MR-${segments.join('-')}`;

      // Criar Licença
      const { data: newLic, error: errLic } = await sb
        .from("licencas")
        .insert({
          chave: key,
          produto_id: produto.id,
          plano_id: plano.id,
          cliente_id: txn.cliente_id,
          revendedor_id: txn.revendedor_id,
          status: "ativa",
          tipo: "premium",
          metadata: ({ transaction_id: txn.id } as unknown) as Json
        })
        .select()
        .single();

      if (errLic) throw errLic;
      result = { type: "license", key, licencaId: newLic.id };
    }

    // Caso B: Compra de Pack de Créditos (Revendedor)
    else if (txn.pack_id) {
      const pack = txn.pack as any;
      if (!txn.revendedor_id) throw new Error("Revendedor não identificado na transação de pack.");

      // Adicionar créditos ao revendedor
      const { data: rev } = await sb
        .from("revendedores")
        .select("saldo_creditos")
        .eq("id", txn.revendedor_id)
        .single();

      const novoSaldo = Number(rev?.saldo_creditos || 0) + Number(pack.quantidade || 0);

      const { error: errSaldo } = await sb
        .from("revendedores")
        .update({ saldo_creditos: novoSaldo })
        .eq("id", txn.revendedor_id);

      if (errSaldo) throw errSaldo;

      // Registrar Ledger
      await sb.from("creditos_ledger").insert({
        revendedor_id: txn.revendedor_id,
        quantidade: Number(pack.quantidade),
        tipo: "credito",
        motivo: `Compra de Pack: ${pack.nome}`,
        metadata: { transaction_id: txn.id, pack_id: pack.id } as any
      });

      result = { type: "credits", amount: pack.quantidade, novoSaldo };
    }

    // 2. Marcar como FULFILLED
    await sb.from("payment_transactions").update({
      metadata: ({
        ...(txn.metadata as any || {}),
        fulfilled_at: new Date().toISOString(),
        fulfillment_result: result
      } as any
    }).eq("id", txn.id);

    // 3. Notificar
    if (txn.cliente?.email) {
      await sb.from("email_queue").insert({
        destinatario: txn.cliente.email,
        assunto: "MR CENTRAL — Sua compra foi processada!",
        template_chave: "fulfillment.sucesso",
        html: `<h1>Olá! Sua compra foi processada com sucesso.</h1><p>Resultado: ${JSON.stringify(result)}</p>`,
        metadata: { result, transaction_id: txn.id } as any
      });
    }

    return { ok: true, result };
  } catch (e: any) {
    console.error("[Fulfillment Error]", e);
    // Registrar falha para auditoria
    await sb.from("payment_webhook_logs").insert({
      gateway_slug: txn.gateway_slug as any,
      event_type: "fulfillment_failure",
      payload: { transaction_id: txn.id, error: e.message } as any,
      status: "error",
      error: e.message
    });
    throw e;
  }
}