/**
 * Camada única para "pagamentos de um cliente".
 *
 * ⚠️  FALLBACK TEMPORÁRIO  ⚠️
 * Hoje `payment_transactions` NÃO possui a coluna `cliente_id`.
 * Enquanto isso, vinculamos pagamentos ao cliente por `cliente_nome`
 * (ILIKE exato ao nome cadastrado).
 *
 * Quando `payment_transactions.cliente_id` existir, a migração é:
 *   1. Ativar `USES_CLIENTE_ID = true` abaixo.
 *   2. As duas funções passam a filtrar por `cliente_id`.
 *   3. NENHUMA tela precisa ser alterada — todas consomem estas funções.
 *
 * NÃO USE `cliente_nome` FORA DESTE ARQUIVO.
 */
import { supabase } from "@/integrations/supabase/client";

// ✅ Fase 3: coluna payment_transactions.cliente_id existe e é preenchida
// automaticamente pelo trigger tg_pagamento_gerar_licenca ao aprovar pagamento.
// O fallback por nome permanece disponível para pagamentos antigos que ainda
// não foram vinculados.
export const USES_CLIENTE_ID = true;

export type ClientePagamento = {
  id: string;
  gateway_slug: string | null;
  valor: number | null;
  moeda: string | null;
  status: string | null;
  metodo: string | null;
  created_at: string;
  aprovado_em: string | null;
};

const APROVADO = ["approved", "pago", "paid", "aprovado"];

export type ClienteRef = { id: string; nome: string | null; email: string | null };

const COLUMNS =
  "id, gateway_slug, valor, moeda, status, metodo, created_at, aprovado_em";

/**
 * Pagamentos de UM cliente. Prefere `cliente_id` (Fase 3) e cai para
 * `cliente_nome` para pagamentos legados (antes do auto-vínculo).
 */
export async function fetchPagamentosByCliente(
  cliente: ClienteRef,
): Promise<ClientePagamento[]> {
  const results = new Map<string, ClientePagamento>();

  const primary = await (supabase as any)
    .from("payment_transactions")
    .select(COLUMNS)
    .eq("cliente_id", cliente.id)
    .order("created_at", { ascending: false });
  for (const r of (primary.data ?? []) as ClientePagamento[]) results.set(r.id, r);

  // fallback legado por nome — só para linhas ainda sem cliente_id
  const nome = (cliente.nome ?? "").trim();
  if (nome) {
    const legacy = await (supabase as any)
      .from("payment_transactions")
      .select(COLUMNS)
      .is("cliente_id", null)
      .ilike("cliente_nome", nome)
      .order("created_at", { ascending: false });
    for (const r of (legacy.data ?? []) as ClientePagamento[])
      if (!results.has(r.id)) results.set(r.id, r);
  }

  return Array.from(results.values()).sort((a, b) =>
    (b.created_at ?? "").localeCompare(a.created_at ?? ""),
  );
}

/** Mapa `cliente.id -> total gasto` para uma lista de clientes. */
export async function fetchGastoMapForClientes(
  clientes: ClienteRef[],
): Promise<Record<string, number>> {
  if (clientes.length === 0) return {};
  const ids = clientes.map((c) => c.id);
  const map: Record<string, number> = {};

  // caminho definitivo — por cliente_id
  const primary = await (supabase as any)
    .from("payment_transactions")
    .select("cliente_id, valor, status")
    .in("cliente_id", ids)
    .in("status", APROVADO);
  for (const r of (primary.data ?? []) as Array<{
    cliente_id: string;
    valor: number | null;
  }>) {
    map[r.cliente_id] = (map[r.cliente_id] ?? 0) + Number(r.valor ?? 0);
  }

  // fallback legado por nome — apenas linhas sem cliente_id
  const { data: legacy } = await (supabase as any)
    .from("payment_transactions")
    .select("cliente_nome, valor, status")
    .is("cliente_id", null)
    .in("status", APROVADO);
  const porNome: Record<string, number> = {};
  for (const r of (legacy ?? []) as Array<{
    cliente_nome: string | null;
    valor: number | null;
  }>) {
    const k = (r.cliente_nome ?? "").trim().toLowerCase();
    if (!k) continue;
    porNome[k] = (porNome[k] ?? 0) + Number(r.valor ?? 0);
  }
  for (const c of clientes) {
    const k = (c.nome ?? "").trim().toLowerCase();
    if (k && porNome[k] != null) map[c.id] = (map[c.id] ?? 0) + porNome[k];
  }
  return map;
}

export function totalAprovado(ps: ClientePagamento[]): number {
  return ps
    .filter((p) => APROVADO.includes((p.status ?? "").toLowerCase()))
    .reduce((s, p) => s + Number(p.valor ?? 0), 0);
}
