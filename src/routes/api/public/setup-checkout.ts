import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/setup-checkout")({
  loader: async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Criar gateway de teste se não existir
    const { data: gws } = await supabaseAdmin.from("payment_gateways").select("id").eq("slug", "mercadopago").maybeSingle();
    
    if (!gws) {
      await supabaseAdmin.from("payment_gateways").insert({
        slug: "mercadopago",
        nome: "Mercado Pago (Sandbox)",
        enabled: true,
        priority: 1,
        webhook_secret: "test_secret_123"
      });
    }

    return { ok: true, message: "Ambiente de checkout preparado." };
  }
});
