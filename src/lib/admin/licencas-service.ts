/**
 * Central de Licenças (Fase 3).
 *
 * Ponto único que TODAS as telas devem usar para agir sobre licenças.
 * Nenhuma rota pode ter lógica própria de licenciamento — sempre chame
 * este módulo. Ele encapsula as RPCs SECURITY DEFINER do banco
 * (que já registram eventos + auditoria) e algumas mutações diretas
 * permitidas pelas policies de admin.
 */
import { supabase } from "@/integrations/supabase/client";

export type LicencaStatus =
  | "ativa"
  | "expirada"
  | "cancelada"
  | "revogada"
  | "aguardando";
export type LicencaTipo = "teste" | "premium";

export type Licenca = {
  id: string;
  chave: string;
  status: LicencaStatus | string;
  tipo: LicencaTipo | string;
  cliente_id: string | null;
  revendedor_id: string | null;
  produto_id: string | null;
  email: string | null;
  expira_em: string | null;
  ativada_em: string | null;
  device_id: string | null;
  ultimo_acesso: string | null;
  duracao_dias: number;
  trial_iniciado_em: string | null;
  trial_duracao_minutos: number | null;
  max_dispositivos: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

// ---------- leituras ---------------------------------------------------------

export async function listarPorCliente(clienteId: string): Promise<Licenca[]> {
  const { data, error } = await (supabase as any)
    .from("licencas")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as Licenca[];
}

export async function listarPorRevendedor(
  revendedorId: string,
): Promise<Licenca[]> {
  const { data, error } = await (supabase as any)
    .from("licencas")
    .select("*")
    .eq("revendedor_id", revendedorId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as Licenca[];
}

export async function listarEventos(licencaId: string) {
  const { data } = await (supabase as any)
    .from("licencas_eventos")
    .select("*")
    .eq("licenca_id", licencaId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function listarAcessos(licencaId: string) {
  const { data } = await (supabase as any)
    .from("licenca_acessos")
    .select("*")
    .eq("licenca_id", licencaId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function listarDispositivos(licencaId: string) {
  const { data } = await (supabase as any)
    .from("licenca_dispositivos")
    .select("*")
    .eq("licenca_id", licencaId)
    .order("ultimo_acesso", { ascending: false });
  return data ?? [];
}

// ---------- mutações (via RPC SECURITY DEFINER — auditadas) ------------------

export async function gerar(
  quantidade: number,
  duracaoDias = 30,
  revendedorId?: string,
): Promise<Licenca[]> {
  const { data, error } = await (supabase as any).rpc("gerar_licencas", {
    _quantidade: quantidade,
    _duracao_dias: duracaoDias,
    _revendedor_id: revendedorId ?? null,
  });
  if (error) throw error;
  return (data ?? []) as Licenca[];
}

export async function bloquear(id: string, motivo?: string) {
  const { error } = await (supabase as any).rpc("cancelar_licenca", {
    _licenca_id: id,
    _motivo: motivo ?? null,
  });
  if (error) throw error;
}
// alias semântico solicitado no briefing
export const cancelar = bloquear;

export async function desbloquear(id: string) {
  const { error } = await (supabase as any).rpc("reativar_licenca", {
    _licenca_id: id,
  });
  if (error) throw error;
}
export const reativar = desbloquear;

export async function renovar(id: string, dias: number) {
  const { error } = await (supabase as any).rpc("renovar_licenca", {
    _licenca_id: id,
    _dias: dias,
  });
  if (error) throw error;
}

export async function resetarDispositivo(id: string) {
  const { error } = await (supabase as any).rpc("resetar_device_licenca", {
    _licenca_id: id,
  });
  if (error) throw error;
}

export async function converterEmPremium(id: string) {
  const { error } = await (supabase as any).rpc(
    "converter_licenca_em_premium",
    { _licenca_id: id },
  );
  if (error) throw error;
}

// ---------- mutações administrativas diretas (RLS admin) ---------------------

/** Move licença para outro cliente. */
export async function mover(id: string, clienteId: string | null) {
  const { error } = await (supabase as any)
    .from("licencas")
    .update({ cliente_id: clienteId })
    .eq("id", id);
  if (error) throw error;
}

/** Transfere licença para outro revendedor. */
export async function transferir(id: string, revendedorId: string) {
  const { error } = await (supabase as any)
    .from("licencas")
    .update({ revendedor_id: revendedorId })
    .eq("id", id);
  if (error) throw error;
}

/** Altera a data de expiração (aceita null = vitalícia). */
export async function alterarValidade(id: string, expiraEm: string | null) {
  const { error } = await (supabase as any)
    .from("licencas")
    .update({ expira_em: expiraEm })
    .eq("id", id);
  if (error) throw error;
}

/** Duplica uma licença mantendo cliente/revendedor mas com nova chave. */
export async function duplicar(id: string): Promise<Licenca> {
  const { data: src, error: e1 } = await (supabase as any)
    .from("licencas")
    .select("*")
    .eq("id", id)
    .single();
  if (e1) throw e1;
  const s = src as Licenca;
  const [nova] = await gerar(1, s.duracao_dias, s.revendedor_id ?? undefined);
  if (nova && s.cliente_id) await mover(nova.id, s.cliente_id);
  return nova;
}

// ---------- lote (usado pelas telas de admin) --------------------------------

async function forEachSequential<T>(
  ids: string[],
  fn: (id: string) => Promise<T>,
) {
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  for (const id of ids) {
    try {
      await fn(id);
      results.push({ id, ok: true });
    } catch (e: any) {
      results.push({ id, ok: false, error: e?.message ?? String(e) });
    }
  }
  return results;
}

export const lote = {
  bloquear: (ids: string[], motivo?: string) =>
    forEachSequential(ids, (id) => bloquear(id, motivo)),
  desbloquear: (ids: string[]) => forEachSequential(ids, desbloquear),
  renovar: (ids: string[], dias: number) =>
    forEachSequential(ids, (id) => renovar(id, dias)),
  alterarValidade: (ids: string[], expiraEm: string | null) =>
    forEachSequential(ids, (id) => alterarValidade(id, expiraEm)),
  mover: (ids: string[], clienteId: string | null) =>
    forEachSequential(ids, (id) => mover(id, clienteId)),
  transferir: (ids: string[], revendedorId: string) =>
    forEachSequential(ids, (id) => transferir(id, revendedorId)),
};

// ---------- catálogo de validades / trials -----------------------------------

export const VALIDADES_PADRAO: Array<{ label: string; dias: number | null }> = [
  { label: "30 dias", dias: 30 },
  { label: "60 dias", dias: 60 },
  { label: "90 dias", dias: 90 },
  { label: "180 dias", dias: 180 },
  { label: "365 dias", dias: 365 },
  { label: "Vitalícia", dias: null },
];

export const TRIAL_OPCOES: Array<{ label: string; minutos: number }> = [
  { label: "30 minutos", minutos: 30 },
  { label: "1 hora", minutos: 60 },
  { label: "12 horas", minutos: 720 },
  { label: "24 horas", minutos: 1440 },
  { label: "3 dias", minutos: 4320 },
  { label: "7 dias", minutos: 10080 },
  { label: "15 dias", minutos: 21600 },
  { label: "30 dias", minutos: 43200 },
];
