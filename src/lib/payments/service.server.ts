import { createClient } from "@supabase/supabase-js";
import { Database } from "@/integrations/supabase/types";

/**
 * Abstração de Pagamentos do MR CENTRAL.
 */
export async function createCheckoutSession(params: {
  planoId?: string;
  packId?: string;
  produtoId?: string;
  clienteId: string;
  gateway: string;
}) {
  const sb = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let amount = 0;
  let description = "";

  if (params.planoId) {
    const { data: plano } = await sb.from("planos").select("preco, nome").eq("id", params.planoId).single();
    amount = Number(plano?.preco || 0);
    description = `Plano ${plano?.nome}`;
  } else if (params.packId) {
    const { data: pack } = await sb.from("creditos_packs").select("preco, nome").eq("id", params.packId).single();
    amount = Number(pack?.preco || 0);
    description = `Pack ${pack?.nome}`;
  }

  // Criar transação interna
  const { data: txn, error } = await sb
    .from("payment_transactions")
    .insert({
      cliente_id: params.clienteId,
      plano_id: params.planoId,
      pack_id: params.packId,
      valor: amount,
      moeda: "BRL",
      status: "pendente",
      gateway_slug: params.gateway as any,
      metodo: "checkout",
      metadata: { description } as never
    })
    .select()
    .single();

  if (error) throw error;

  // Integração com Gateway (Mock para Sandbox nesta fase)
  // Em produção, aqui chamamos API do Mercado Pago / Stripe
  const checkoutUrl = `https://checkout.sandbox.mrcentral.com/pay/${txn.id}`;

  return {
    transactionId: txn.id,
    checkoutUrl,
    amount,
    currency: "BRL"
  };
}
