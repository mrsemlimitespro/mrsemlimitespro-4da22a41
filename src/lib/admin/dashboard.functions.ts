import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getDashboardStats = createServerFn({ method: "GET" })
  .handler(async () => {
    const [clientes, revendedores, produtos, extensoes, licencas, licencasExpiradas, trials, dispositivos, pedidos, vendas] = await Promise.all([
      supabaseAdmin.from("clientes").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("revendedores").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("produtos").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("extensoes").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("licencas").select("id", { count: "exact", head: true }).eq("status", "ativa"),
      supabaseAdmin.from("licencas").select("id", { count: "exact", head: true }).eq("status", "expirada"),
      supabaseAdmin.from("trials_emitidos").select("id", { count: "exact", head: true }).gt("expires_at", new Date().toISOString()),
      supabaseAdmin.from("dispositivos").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("payment_transactions").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("payment_transactions").select("id", { count: "exact", head: true }).eq("status", "aprovado")
    ]);

    return {
      clientes: clientes.count || 0,
      revendedores: revendedores.count || 0,
      produtos: produtos.count || 0,
      extensoes: extensoes.count || 0,
      licencasAtivas: licencas.count || 0,
      licencasExpiradas: licencasExpiradas.count || 0,
      trialsAtivos: trials.count || 0,
      dispositivos: dispositivos.count || 0,
      pedidos: pedidos.count || 0,
      vendas: vendas.count || 0
    };
  });
