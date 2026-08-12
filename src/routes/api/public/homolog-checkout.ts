import { createFileRoute } from "@tanstack/react-router";
import { executeFulfillment } from "@/lib/comercial-fulfillment.server";

export const Route = createFileRoute("/api/public/homolog-checkout")({
  loader: async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Criar Cliente Teste
    const { data: cliente } = await supabaseAdmin.from("clientes").insert({
      nome: "Cliente Teste E2E",
      email: "teste-e2e@mrcentral.com",
      status: "ativo"
    }).select().single();

    if (!cliente) return { ok: false, error: "Falha ao criar cliente teste" };

    // 2. Localizar um Plano
    const { data: plano } = await sbAdmin().from("planos").select("id").limit(1).single();
    if (!plano) return { ok: false, error: "Nenhum plano cadastrado" };

    // 3. Simular Transação Aprovada
    const { data: txn } = await supabaseAdmin.from("payment_transactions").insert({
      cliente_id: cliente.id,
      plano_id: plano.id,
      valor: 99.9,
      status: "aprovado",
      gateway_slug: "mercadopago",
      metodo: "pix",
      metadata: { is_test: true } as any
    }).select().single();

    if (!txn) return { ok: false, error: "Falha ao criar transação" };

    // 4. Disparar Fulfillment
    const result = await executeFulfillment({ transactionId: txn.id });

    return { 
      ok: true, 
      homologacao: "E2E Checkout & Fulfillment",
      cliente: cliente.id,
      transacao: txn.id,
      fulfillment: result 
    };
  }
});

function sbAdmin() {
    const { supabaseAdmin } = require("@/integrations/supabase/client.server");
    return supabaseAdmin;
}
