import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Mail,
  Phone,
  MessageCircle,
  IdCard,
  Building2,
  KeyRound,
  Package,
  DollarSign,
  Download,
  Store,
  Eye,
  Pencil,
  Loader2,
  ShieldCheck,
  Clock,
  Ban,
  FlaskConical,
  CalendarClock,
  History,
  RefreshCw,
  Lock,
  Unlock,
  CalendarRange,
  FileDown,
  Send,
  MoveRight,
  Trash2,
  StickyNote,
  ListChecks,
  Search,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { setImpersonation } from "@/lib/impersonation";
import { cn } from "@/lib/utils";
import {
  fetchPagamentosByCliente,
  totalAprovado,
} from "@/lib/admin/cliente-pagamentos";
import { exportCsv, exportXlsx, exportPdf } from "@/lib/admin/cliente-export";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/clientes/$id")({
  head: () => ({
    meta: [
      { title: "Cliente — Admin" },
      { name: "description", content: "Ficha completa do cliente." },
    ],
  }),
  component: ClienteDetailPage,
});

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
const dt = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleString("pt-BR") : "—";
const d = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleDateString("pt-BR") : "—";

type LicStatus = "ativa" | "aguardando" | "teste" | "bloqueada" | "expirada";
type Licenca = {
  id: string;
  chave: string | null;
  status: string | null;
  plano: string | null;
  tipo: string | null;
  produto_id: string | null;
  device_id: string | null;
  ultimo_acesso: string | null;
  ativada_em: string | null;
  expira_em: string | null;
  created_at: string;
  trial_iniciado_em: string | null;
  trial_duracao_minutos: number | null;
  licenca_produtos: { nome: string; slug: string } | null;
};

function classify(l: Licenca): LicStatus {
  const st = (l.status ?? "").toLowerCase();
  if (st === "revogada" || st === "bloqueada" || st === "cancelada") return "bloqueada";
  if (st === "expirada") return "expirada";
  const exp = l.expira_em ? new Date(l.expira_em).getTime() : null;
  if (exp !== null && exp < Date.now()) return "expirada";
  if (st === "teste" || st === "trial" || (l.tipo ?? "").toLowerCase() === "trial") return "teste";
  if (!l.ativada_em || st === "pendente" || st === "aguardando") return "aguardando";
  return "ativa";
}

const STATUS_META: Record<
  LicStatus,
  { label: string; color: string; icon: any }
> = {
  ativa:      { label: "Ativa",                color: "var(--brand-emerald)",    icon: ShieldCheck },
  aguardando: { label: "Aguardando ativação",  color: "oklch(0.82 0.17 90)",     icon: Clock },
  teste:      { label: "Em teste",             color: "var(--brand-blue)",       icon: FlaskConical },
  bloqueada:  { label: "Bloqueada",            color: "oklch(0.7 0.22 25)",      icon: Ban },
  expirada:   { label: "Expirada",             color: "oklch(0.65 0.02 250)",    icon: CalendarClock },
};

function diasEntre(iso: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}
function minutosRestantesTrial(l: Licenca) {
  if (!l.trial_iniciado_em || !l.trial_duracao_minutos) return null;
  const fim = new Date(l.trial_iniciado_em).getTime() + l.trial_duracao_minutos * 60_000;
  const min = Math.max(0, Math.round((fim - Date.now()) / 60_000));
  return min;
}
function fmtTrial(min: number) {
  if (min >= 1440) return `${Math.floor(min / 1440)}d`;
  if (min >= 60) return `${Math.floor(min / 60)}h`;
  return `${min}min`;
}

function ClienteDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: cliente, isLoading } = useQuery({
    queryKey: ["admin", "cliente", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clientes")
        .select(
          "id, nome, email, telefone, whatsapp, cpf, empresa, observacoes, status, plano, expira_em, ultimo_acesso, created_at, revendedor_id, revendedores:revendedor_id(id, nome, email)",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: licencas = [] } = useQuery({
    queryKey: ["admin", "cliente", id, "licencas"],
    queryFn: async (): Promise<Licenca[]> => {
      const { data } = await (supabase as any)
        .from("licencas")
        .select(
          "id, chave, status, plano, tipo, produto_id, device_id, ultimo_acesso, ativada_em, expira_em, created_at, trial_iniciado_em, trial_duracao_minutos, licenca_produtos:produto_id(nome, slug)",
        )
        .eq("cliente_id", id)
        .order("created_at", { ascending: false });
      return (data ?? []) as Licenca[];
    },
  });

  const licencaIds = useMemo(() => licencas.map((l) => l.id), [licencas]);

  const { data: dispositivos = [] } = useQuery({
    queryKey: ["admin", "cliente", id, "dispositivos", licencaIds.length],
    enabled: licencaIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("licenca_dispositivos")
        .select("licenca_id, device_id, device_nome, ip, user_agent, ultimo_acesso")
        .in("licenca_id", licencaIds)
        .order("ultimo_acesso", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const dispByLic = useMemo(() => {
    const m = new Map<string, any>();
    for (const dv of dispositivos) if (!m.has(dv.licenca_id)) m.set(dv.licenca_id, dv);
    return m;
  }, [dispositivos]);

  const { data: acessos = [] } = useQuery({
    queryKey: ["admin", "cliente", id, "acessos", licencaIds.length],
    enabled: licencaIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("licenca_acessos")
        .select("licenca_id, ip, user_agent, versao, resultado, created_at")
        .in("licenca_id", licencaIds)
        .order("created_at", { ascending: false })
        .limit(200);
      return (data ?? []) as any[];
    },
  });

  const acessoByLic = useMemo(() => {
    const m = new Map<string, any>();
    for (const a of acessos) if (!m.has(a.licenca_id)) m.set(a.licenca_id, a);
    return m;
  }, [acessos]);

  const { data: eventos = [] } = useQuery({
    queryKey: ["admin", "cliente", id, "eventos", licencaIds.length],
    enabled: licencaIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("licencas_eventos")
        .select("id, licenca_id, tipo, mensagem, ip, device_id, metadata, created_at")
        .in("licenca_id", licencaIds)
        .order("created_at", { ascending: false })
        .limit(300);
      return (data ?? []) as any[];
    },
  });

  const { data: pagamentos = [] } = useQuery({
    queryKey: ["admin", "cliente", id, "pagamentos"],
    enabled: !!cliente,
    queryFn: () => fetchPagamentosByCliente(cliente!),
  });

  const { data: downloads = [] } = useQuery({
    queryKey: ["admin", "cliente", id, "downloads", cliente?.email],
    enabled: !!cliente?.email,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("pack_download_logs")
        .select("id, pack_slug, file_name, file_size, ip, device, browser, status, created_at")
        .eq("user_email", cliente!.email!)
        .order("created_at", { ascending: false })
        .limit(200);
      return (data ?? []) as any[];
    },
  });

  const resumo = useMemo(() => {
    const b = { ativa: 0, aguardando: 0, teste: 0, bloqueada: 0, expirada: 0 };
    for (const l of licencas) b[classify(l)]++;
    return b;
  }, [licencas]);

  const ultimaCompra = useMemo(() => {
    const aprov = pagamentos
      .filter((p) => ["approved", "pago", "paid", "aprovado"].includes((p.status ?? "").toLowerCase()))
      .map((p) => p.aprovado_em ?? p.created_at)
      .filter(Boolean) as string[];
    const licDates = licencas.map((l) => l.created_at).filter(Boolean);
    const all = [...aprov, ...licDates].sort();
    return all.at(-1) ?? null;
  }, [pagamentos, licencas]);

  const valorTotal = totalAprovado(pagamentos);

  const produtosUnicos = useMemo(
    () =>
      Array.from(
        new Map(
          licencas
            .filter((l) => l.licenca_produtos)
            .map((l) => [l.produto_id, l.licenca_produtos as { nome: string; slug: string }]),
        ).values(),
      ),
    [licencas],
  );

  // Bulk actions
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleOne = (lid: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(lid) ? n.delete(lid) : n.add(lid);
      return n;
    });
  const toggleAll = () => {
    if (selected.size === licencas.length) setSelected(new Set());
    else setSelected(new Set(licencas.map((l) => l.id)));
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "cliente", id] });
  };

  const bulkRun = useMutation({
    mutationFn: async ({
      ids,
      action,
      dias,
      novaValidade,
      novoClienteId,
    }: {
      ids: string[];
      action: "bloquear" | "desbloquear" | "renovar" | "validade" | "mover" | "excluir";
      dias?: number;
      novaValidade?: string;
      novoClienteId?: string;
    }) => {
      for (const lid of ids) {
        if (action === "bloquear") {
          const { error } = await (supabase as any).rpc("cancelar_licenca", {
            _licenca_id: lid,
            _motivo: "Bloqueio em lote pelo admin",
          });
          if (error) throw error;
        } else if (action === "desbloquear") {
          const { error } = await (supabase as any).rpc("reativar_licenca", { _licenca_id: lid });
          if (error) throw error;
        } else if (action === "renovar") {
          const { error } = await (supabase as any).rpc("renovar_licenca", { _licenca_id: lid, _dias: dias ?? 30 });
          if (error) throw error;
        } else if (action === "validade") {
          const { error } = await supabase.from("licencas").update({ expira_em: novaValidade! }).eq("id", lid);
          if (error) throw error;
        } else if (action === "mover") {
          const { error } = await supabase.from("licencas").update({ cliente_id: novoClienteId! }).eq("id", lid);
          if (error) throw error;
        } else if (action === "excluir") {
          // soft-delete: cancela via RPC — preserva histórico e respeita RLS.
          const { error } = await (supabase as any).rpc("cancelar_licenca", {
            _licenca_id: lid,
            _motivo: "Excluída em lote pelo admin",
          });
          if (error) throw error;
        }
      }
    },
    onSuccess: (_r, vars) => {
      toast.success(`${vars.ids.length} licença(s) atualizada(s).`);
      setSelected(new Set());
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Falha na ação em lote"),
  });

  function askDias(): number | null {
    const raw = window.prompt("Renovar por quantos dias?", "30");
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  function askDate(): string | null {
    const raw = window.prompt("Nova validade (AAAA-MM-DD):", "");
    if (!raw) return null;
    const dtv = new Date(raw);
    return isNaN(+dtv) ? null : dtv.toISOString();
  }

  function licencasRowsForExport(sel = false) {
    const src = sel ? licencas.filter((l) => selected.has(l.id)) : licencas;
    return src.map((l) => {
      const dv = dispByLic.get(l.id);
      const ac = acessoByLic.get(l.id);
      return {
        Chave: l.chave ?? "",
        Produto: l.licenca_produtos?.nome ?? "",
        Plano: l.plano ?? "",
        Status: classify(l),
        Criada: l.created_at,
        Ativada: l.ativada_em ?? "",
        Expira: l.expira_em ?? "",
        Dispositivo: dv?.device_nome ?? l.device_id ?? "",
        IP: ac?.ip ?? dv?.ip ?? "",
        UserAgent: ac?.user_agent ?? dv?.user_agent ?? "",
        Versao: ac?.versao ?? "",
      };
    });
  }

  const [moveOpen, setMoveOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="glass mx-auto flex max-w-4xl items-center justify-center rounded-2xl px-6 py-14 text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" /> Carregando cliente...
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Link
          to="/admin/clientes"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Voltar
        </Link>
        <div className="glass rounded-2xl px-6 py-14 text-center text-sm text-muted-foreground">
          Cliente não encontrado.
        </div>
      </div>
    );
  }

  const initial = (cliente.nome || cliente.email || "?").charAt(0).toUpperCase();
  const selCount = selected.size;

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/admin/clientes"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Voltar para Clientes
        </Link>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setImpersonation({
                kind: "cliente",
                id: cliente.id,
                name: cliente.nome ?? "—",
                email: cliente.email ?? "—",
                returnTo: window.location.pathname,
              });
              navigate({ to: "/dashboard" });
            }}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-border/60 bg-white/[0.02] px-3 text-sm hover:bg-white/[0.06]"
          >
            <Eye className="size-4" /> Visualizar Painel
          </button>
          <Link
            to="/admin/$resource"
            params={{ resource: "clientes" }}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-border/60 bg-white/[0.02] px-3 text-sm hover:bg-white/[0.06]"
          >
            <Pencil className="size-4" /> Editar
          </Link>
        </div>
      </div>

      {/* Cabeçalho */}
      <header className="glass flex items-center gap-5 rounded-2xl p-5">
        <div
          className="grid size-16 shrink-0 place-items-center rounded-2xl text-2xl font-semibold text-white"
          style={{
            background: "linear-gradient(135deg, var(--brand-magenta), var(--brand-orange))",
            boxShadow: "0 0 30px -6px color-mix(in oklab, var(--brand-magenta) 60%, transparent)",
          }}
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">
            {cliente.nome ?? "—"}
          </h1>
          <p className="truncate text-sm text-muted-foreground">{cliente.email ?? "—"}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Cadastro: {dt(cliente.created_at)}</span>
            {cliente.status && (
              <span className="rounded-full border border-border/60 px-2 py-0.5">
                {cliente.status}
              </span>
            )}
            {cliente.telefone && <span>Tel: {cliente.telefone}</span>}
            {cliente.empresa && <span>{cliente.empresa}</span>}
            {cliente.cpf && <span>CPF: {cliente.cpf}</span>}
          </div>
        </div>
      </header>

      {/* Resumo superior */}
      <section className="glass rounded-2xl p-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <SummaryTile label="Total de licenças" value={licencas.length} color="var(--brand-violet)" icon={KeyRound} />
          <SummaryTile label="Ativas" value={resumo.ativa} color={STATUS_META.ativa.color} icon={ShieldCheck} />
          <SummaryTile label="Aguardando ativação" value={resumo.aguardando} color={STATUS_META.aguardando.color} icon={Clock} />
          <SummaryTile label="Em teste" value={resumo.teste} color={STATUS_META.teste.color} icon={FlaskConical} />
          <SummaryTile label="Bloqueadas" value={resumo.bloqueada} color={STATUS_META.bloqueada.color} icon={Ban} />
          <SummaryTile label="Expiradas" value={resumo.expirada} color={STATUS_META.expirada.color} icon={CalendarClock} />
          <SummaryTile label="Último acesso" text={dt(cliente.ultimo_acesso)} color="var(--brand-cyan)" icon={History} />
          <SummaryTile label="Última compra" text={ultimaCompra ? d(ultimaCompra) : "—"} color="var(--brand-blue)" icon={CalendarClock} />
          <SummaryTile label="Valor gasto" text={pagamentos.length ? brl(valorTotal) : "—"} color="var(--brand-emerald)" icon={DollarSign} />
          <SummaryTile label="Revendedor responsável" text={cliente.revendedores?.nome ?? "—"} color="var(--brand-cyan)" icon={Store} />
        </div>
      </section>

      <Tabs defaultValue="licencas" className="space-y-4">
        <TabsList className="glass h-auto flex-wrap gap-1 rounded-2xl bg-transparent p-1">
          <TabsTrigger value="licencas" className="rounded-xl px-3 py-1.5"><KeyRound className="mr-1.5 size-3.5" />Licenças</TabsTrigger>
          <TabsTrigger value="compras" className="rounded-xl px-3 py-1.5"><DollarSign className="mr-1.5 size-3.5" />Compras</TabsTrigger>
          <TabsTrigger value="produtos" className="rounded-xl px-3 py-1.5"><Package className="mr-1.5 size-3.5" />Produtos</TabsTrigger>
          <TabsTrigger value="downloads" className="rounded-xl px-3 py-1.5"><Download className="mr-1.5 size-3.5" />Downloads</TabsTrigger>
          <TabsTrigger value="historico" className="rounded-xl px-3 py-1.5"><History className="mr-1.5 size-3.5" />Histórico</TabsTrigger>
          <TabsTrigger value="observacoes" className="rounded-xl px-3 py-1.5"><StickyNote className="mr-1.5 size-3.5" />Observações</TabsTrigger>
          <TabsTrigger value="logs" className="rounded-xl px-3 py-1.5"><ListChecks className="mr-1.5 size-3.5" />Logs</TabsTrigger>
        </TabsList>

        {/* ---- LICENÇAS ---- */}
        <TabsContent value="licencas" className="space-y-4">
          <Card
            title={`Licenças (${licencas.length})`}
            icon={<KeyRound className="size-4 text-[color:var(--brand-violet)]" />}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={selected.size > 0 && selected.size === licencas.length}
                  onChange={toggleAll}
                  className="size-4 rounded border-border/60 bg-transparent"
                />
                Selecionar todas
              </label>
              <span className="text-xs text-muted-foreground">{selCount} selecionada(s)</span>
              <div className="ml-auto flex flex-wrap gap-1.5">
                <BulkBtn icon={Lock} disabled={selCount === 0 || bulkRun.isPending}
                  onClick={() => bulkRun.mutate({ ids: [...selected], action: "bloquear" })}>Bloquear</BulkBtn>
                <BulkBtn icon={Unlock} disabled={selCount === 0 || bulkRun.isPending}
                  onClick={() => bulkRun.mutate({ ids: [...selected], action: "desbloquear" })}>Desbloquear</BulkBtn>
                <BulkBtn icon={RefreshCw} disabled={selCount === 0 || bulkRun.isPending}
                  onClick={() => { const dd = askDias(); if (dd) bulkRun.mutate({ ids: [...selected], action: "renovar", dias: dd }); }}>Renovar</BulkBtn>
                <BulkBtn icon={CalendarRange} disabled={selCount === 0 || bulkRun.isPending}
                  onClick={() => { const nv = askDate(); if (nv) bulkRun.mutate({ ids: [...selected], action: "validade", novaValidade: nv }); }}>Alterar validade</BulkBtn>
                <BulkBtn icon={MoveRight} disabled={selCount === 0 || bulkRun.isPending} onClick={() => setMoveOpen(true)}>Mover</BulkBtn>
                <BulkBtn icon={Trash2} disabled={selCount === 0 || bulkRun.isPending} onClick={() => setDelOpen(true)}>Excluir</BulkBtn>
                <BulkBtn icon={FileDown} disabled={selCount === 0} onClick={() => exportCsv(`licencas-${cliente.nome ?? id}`, licencasRowsForExport(true))}>CSV</BulkBtn>
                <BulkBtn icon={FileDown} disabled={selCount === 0} onClick={() => exportXlsx(`licencas-${cliente.nome ?? id}`, licencasRowsForExport(true))}>XLSX</BulkBtn>
                <BulkBtn icon={FileDown} disabled={selCount === 0} onClick={() => exportPdf(`licencas-${cliente.nome ?? id}`, `Licenças de ${cliente.nome ?? "—"}`, licencasRowsForExport(true))}>PDF</BulkBtn>
                <BulkBtn icon={Send} disabled={selCount === 0}
                  onClick={() => toast.info("Envio ao cliente será conectado à automação de e-mail existente.")}>Enviar</BulkBtn>
              </div>
            </div>

            {licencas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma licença.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/50">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="w-10 px-3 py-2"></th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Chave</th>
                      <th className="px-3 py-2 text-left">Produto</th>
                      <th className="px-3 py-2 text-left">Ativada</th>
                      <th className="px-3 py-2 text-left">Expira</th>
                      <th className="px-3 py-2 text-left">Dispositivo</th>
                      <th className="px-3 py-2 text-left">SO / Versão</th>
                      <th className="px-3 py-2 text-left">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {licencas.map((l) => {
                      const kind = classify(l);
                      const meta = STATUS_META[kind];
                      const Icon = meta.icon;
                      let extra: string | null = null;
                      if (kind === "ativa") {
                        const dd = diasEntre(l.expira_em);
                        extra = dd == null ? null : `${dd}d restantes`;
                      } else if (kind === "teste") {
                        const mm = minutosRestantesTrial(l);
                        extra = mm == null ? null : `${fmtTrial(mm)} restantes`;
                      }
                      const checked = selected.has(l.id);
                      const dv = dispByLic.get(l.id);
                      const ac = acessoByLic.get(l.id);
                      return (
                        <tr key={l.id} className={cn("border-t border-border/40", checked && "bg-white/[0.04]")}>
                          <td className="px-3 py-2">
                            <input type="checkbox" checked={checked} onChange={() => toggleOne(l.id)}
                              className="size-4 rounded border-border/60 bg-transparent" />
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium"
                              style={{
                                color: meta.color,
                                borderColor: `color-mix(in oklab, ${meta.color} 45%, transparent)`,
                                background: `color-mix(in oklab, ${meta.color} 12%, transparent)`,
                              }}
                            >
                              <span className="size-1.5 rounded-full" style={{ background: meta.color }} />
                              <Icon className="size-3" strokeWidth={2.5} />
                              {meta.label}
                              {extra && <span className="ml-1 opacity-80">· {extra}</span>}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{l.chave ?? "—"}</td>
                          <td className="px-3 py-2">{l.licenca_produtos?.nome ?? "—"}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{dt(l.ativada_em)}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{dt(l.expira_em)}</td>
                          <td className="px-3 py-2 text-xs">{dv?.device_nome ?? l.device_id ?? "—"}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[220px]">
                            {(ac?.user_agent ?? dv?.user_agent ?? "—")}{ac?.versao ? ` · v${ac.versao}` : ""}
                          </td>
                          <td className="px-3 py-2 text-xs">{ac?.ip ?? dv?.ip ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ---- COMPRAS ---- */}
        <TabsContent value="compras">
          <Card title={`Compras (${pagamentos.length})`} icon={<DollarSign className="size-4 text-[color:var(--brand-emerald)]" />}>
            {pagamentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/50">
                <table className="w-full text-sm">
                  <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Data</th>
                      <th className="px-3 py-2 text-left">Pedido</th>
                      <th className="px-3 py-2 text-left">Gateway</th>
                      <th className="px-3 py-2 text-left">Método</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagamentos.map((p) => (
                      <tr key={p.id} className="border-t border-border/40">
                        <td className="px-3 py-2 text-xs text-muted-foreground">{dt(p.created_at)}</td>
                        <td className="px-3 py-2 font-mono text-[11px]">{p.id.slice(0, 8)}…</td>
                        <td className="px-3 py-2">{p.gateway_slug ?? "—"}</td>
                        <td className="px-3 py-2">{p.metodo ?? "—"}</td>
                        <td className="px-3 py-2">{p.status ?? "—"}</td>
                        <td className="px-3 py-2 text-right font-medium">{brl(Number(p.valor ?? 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ---- PRODUTOS ---- */}
        <TabsContent value="produtos">
          <Card title={`Produtos (${produtosUnicos.length})`} icon={<Package className="size-4 text-[color:var(--brand-orange)]" />}>
            {produtosUnicos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum produto associado.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {produtosUnicos.map((p) => (
                  <span key={p.slug} className="rounded-full border border-border/60 bg-white/[0.03] px-3 py-1 text-xs">
                    {p.nome}
                  </span>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ---- DOWNLOADS ---- */}
        <TabsContent value="downloads">
          <Card title={`Downloads (${downloads.length})`} icon={<Download className="size-4 text-[color:var(--brand-blue)]" />}>
            {downloads.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem downloads registrados.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/50">
                <table className="w-full text-sm">
                  <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Data</th>
                      <th className="px-3 py-2 text-left">Arquivo</th>
                      <th className="px-3 py-2 text-left">Pack</th>
                      <th className="px-3 py-2 text-left">IP</th>
                      <th className="px-3 py-2 text-left">Dispositivo</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {downloads.map((dl) => (
                      <tr key={dl.id} className="border-t border-border/40">
                        <td className="px-3 py-2 text-xs text-muted-foreground">{dt(dl.created_at)}</td>
                        <td className="px-3 py-2">{dl.file_name ?? "—"}</td>
                        <td className="px-3 py-2 text-xs">{dl.pack_slug ?? "—"}</td>
                        <td className="px-3 py-2 text-xs">{dl.ip ?? "—"}</td>
                        <td className="px-3 py-2 text-xs">{dl.device ?? dl.browser ?? "—"}</td>
                        <td className="px-3 py-2 text-xs">{dl.status ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ---- HISTÓRICO ---- */}
        <TabsContent value="historico">
          <HistoricoTimeline
            pagamentos={pagamentos as any[]}
            eventos={eventos}
            downloads={downloads}
          />
        </TabsContent>

        {/* ---- OBSERVAÇÕES ---- */}
        <TabsContent value="observacoes">
          <ObservacoesCard clienteId={id} initial={cliente.observacoes ?? ""} onSaved={invalidate} />
        </TabsContent>

        {/* ---- LOGS ---- */}
        <TabsContent value="logs">
          <Card title={`Logs (${eventos.length})`} icon={<ListChecks className="size-4 text-[color:var(--brand-cyan)]" />}>
            {eventos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem eventos registrados.</p>
            ) : (
              <ul className="space-y-1.5">
                {eventos.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 rounded-lg border border-border/40 bg-white/[0.02] px-3 py-2 text-sm">
                    <span className="rounded-full border border-border/60 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {e.tipo}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{e.mensagem ?? "—"}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {dt(e.created_at)}{e.ip ? ` · ${e.ip}` : ""}{e.device_id ? ` · ${e.device_id}` : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Mover */}
      <MoverDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        excludeClienteId={id}
        count={selCount}
        onConfirm={(novoClienteId) =>
          bulkRun.mutate({ ids: [...selected], action: "mover", novoClienteId }, {
            onSuccess: () => setMoveOpen(false),
          })
        }
      />

      {/* Dialog: Excluir */}
      <Dialog open={delOpen} onOpenChange={setDelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir licenças</DialogTitle>
            <DialogDescription>
              A exclusão será registrada como cancelamento (soft-delete) para preservar
              o histórico. {selCount} licença(s) serão canceladas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button className="inline-flex h-9 items-center rounded-xl border border-border/60 bg-white/[0.02] px-3 text-sm"
              onClick={() => setDelOpen(false)}>Cancelar</button>
            <button
              className="inline-flex h-9 items-center rounded-xl border border-red-500/40 bg-red-500/10 px-3 text-sm text-red-300 hover:bg-red-500/20"
              onClick={() => bulkRun.mutate({ ids: [...selected], action: "excluir" }, {
                onSuccess: () => setDelOpen(false),
              })}
            >Excluir</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================ SUB-COMPONENTES ============================

function ObservacoesCard({
  clienteId,
  initial,
  onSaved,
}: { clienteId: string; initial: string; onSaved: () => void }) {
  const [val, setVal] = useState(initial);
  const [saving, setSaving] = useState(false);
  return (
    <Card title="Observações internas" icon={<StickyNote className="size-4 text-[color:var(--brand-violet)]" />}>
      <p className="mb-2 text-xs text-muted-foreground">Somente administradores visualizam este bloco.</p>
      <textarea
        value={val}
        onChange={(e) => setVal(e.target.value)}
        rows={8}
        className="w-full rounded-xl border border-border/60 bg-white/[0.02] p-3 text-sm outline-none focus:border-white/20"
        placeholder="Anotações internas sobre o cliente..."
      />
      <div className="mt-3 flex justify-end">
        <button
          disabled={saving || val === initial}
          onClick={async () => {
            setSaving(true);
            const { error } = await supabase.from("clientes").update({ observacoes: val }).eq("id", clienteId);
            setSaving(false);
            if (error) toast.error(error.message);
            else { toast.success("Observações salvas."); onSaved(); }
          }}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-border/60 bg-white/[0.04] px-3 text-sm hover:bg-white/[0.08] disabled:opacity-40"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Salvar
        </button>
      </div>
    </Card>
  );
}

function HistoricoTimeline({
  pagamentos,
  eventos,
  downloads,
}: { pagamentos: any[]; eventos: any[]; downloads: any[] }) {
  type Item = { ts: string; kind: string; label: string; sub?: string; color: string };
  const items: Item[] = [];
  for (const p of pagamentos) {
    items.push({
      ts: p.aprovado_em ?? p.created_at,
      kind: "compra",
      label: `Compra ${brl(Number(p.valor ?? 0))} · ${p.status ?? "—"}`,
      sub: `${p.gateway_slug ?? ""}${p.metodo ? " · " + p.metodo : ""}`,
      color: "var(--brand-emerald)",
    });
  }
  for (const e of eventos) {
    items.push({
      ts: e.created_at,
      kind: e.tipo,
      label: e.mensagem ?? e.tipo,
      sub: [e.ip, e.device_id].filter(Boolean).join(" · "),
      color: "var(--brand-violet)",
    });
  }
  for (const d of downloads) {
    items.push({
      ts: d.created_at,
      kind: "download",
      label: `Download: ${d.file_name ?? d.pack_slug ?? "arquivo"}`,
      sub: [d.ip, d.device ?? d.browser].filter(Boolean).join(" · "),
      color: "var(--brand-blue)",
    });
  }
  items.sort((a, b) => (a.ts < b.ts ? 1 : -1));

  return (
    <Card title={`Histórico (${items.length})`} icon={<History className="size-4 text-[color:var(--brand-blue)]" />}>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem histórico.</p>
      ) : (
        <ol className="relative space-y-3 border-l border-border/50 pl-5">
          {items.slice(0, 200).map((it, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[26px] top-1.5 size-2.5 rounded-full ring-4 ring-background" style={{ background: it.color }} />
              <div className="text-sm">{it.label}</div>
              <div className="text-[11px] text-muted-foreground">
                {dt(it.ts)}{it.sub ? ` · ${it.sub}` : ""} · <span className="uppercase tracking-wider">{it.kind}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function MoverDialog({
  open,
  onOpenChange,
  excludeClienteId,
  count,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  excludeClienteId: string;
  count: number;
  onConfirm: (novoClienteId: string) => void;
}) {
  const [q, setQ] = useState("");
  const { data = [] } = useQuery({
    queryKey: ["admin", "cliente-mover", q],
    enabled: open,
    queryFn: async () => {
      let query = (supabase as any).from("clientes").select("id, nome, email").neq("id", excludeClienteId).limit(20);
      if (q.trim()) query = query.or(`nome.ilike.%${q}%,email.ilike.%${q}%`);
      const { data } = await query;
      return (data ?? []) as any[];
    },
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Mover licenças para outro cliente</DialogTitle>
          <DialogDescription>
            Selecione o cliente de destino. {count} licença(s) serão reatribuídas.
          </DialogDescription>
        </DialogHeader>
        <label className="glass relative flex h-11 w-full items-center rounded-xl pl-10 pr-3">
          <Search className="absolute left-3 size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="h-full w-full bg-transparent text-sm outline-none"
          />
        </label>
        <ul className="max-h-64 space-y-1 overflow-auto">
          {data.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm",
                  selectedId === c.id ? "border-white/30 bg-white/[0.06]" : "border-border/50 bg-white/[0.02] hover:bg-white/[0.04]",
                )}
              >
                <span className="truncate">{c.nome ?? "—"}</span>
                <span className="ml-3 shrink-0 text-xs text-muted-foreground">{c.email ?? "—"}</span>
              </button>
            </li>
          ))}
          {data.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado.</li>
          )}
        </ul>
        <DialogFooter>
          <button className="inline-flex h-9 items-center rounded-xl border border-border/60 bg-white/[0.02] px-3 text-sm"
            onClick={() => onOpenChange(false)}>Cancelar</button>
          <button
            disabled={!selectedId}
            className="inline-flex h-9 items-center rounded-xl border border-border/60 bg-white/[0.06] px-3 text-sm hover:bg-white/[0.1] disabled:opacity-40"
            onClick={() => selectedId && onConfirm(selectedId)}
          >Mover</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryTile({
  label, value, text, color, icon: Icon,
}: { label: string; value?: number; text?: string; color: string; icon: any }) {
  return (
    <div className="rounded-xl border border-border/50 bg-white/[0.02] p-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5" style={{ color }} strokeWidth={2.5} />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 truncate text-lg font-semibold tracking-tight" style={value != null ? { color } : undefined}>
        {value != null ? value : text}
      </div>
    </div>
  );
}

function BulkBtn({
  icon: Icon, children, disabled, onClick,
}: { icon: any; children: React.ReactNode; disabled?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/60 bg-white/[0.02] px-2.5 text-xs",
        "transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40",
      )}>
      <Icon className="size-3.5" strokeWidth={2} />
      {children}
    </button>
  );
}

function Card({
  title, icon, children, className,
}: { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("glass rounded-2xl p-5", className)}>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {icon}<span>{title}</span>
      </div>
      {children}
    </section>
  );
}
