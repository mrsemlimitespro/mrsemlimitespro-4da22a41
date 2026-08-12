import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Search,
  KeyRound,
  ShieldCheck,
  Clock,
  Ban,
  Store,
  DollarSign,
  Calendar,
  ArrowRight,
  Loader2,
  FileDown,
  Filter,
  FlaskConical,
  CalendarClock,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { fetchGastoMapForClientes } from "@/lib/admin/cliente-pagamentos";
import { exportCsv, exportXlsx, exportPdf } from "@/lib/admin/cliente-export";

export const Route = createFileRoute("/admin/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — Admin" },
      { name: "description", content: "Gestão de clientes." },
    ],
  }),
  component: AdminClientesPage,
});

type Cliente = {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  cpf: string | null;
  empresa: string | null;
  created_at: string | null;
  revendedor_id: string | null;
  revendedores?: { nome: string | null } | null;
  licencas?: Array<{
    id: string;
    chave: string | null;
    status: string | null;
    ativada_em: string | null;
    created_at: string | null;
    expira_em: string | null;
    tipo: string | null;
  }>;
};

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

type Licenca = NonNullable<Cliente["licencas"]>[number];
type LicStatus = "ativa" | "aguardando" | "teste" | "bloqueada" | "expirada";
function classify(l: Licenca): LicStatus {
  const st = (l.status ?? "").toLowerCase();
  const exp = l.expira_em ? new Date(l.expira_em).getTime() : null;
  if (st === "revogada" || st === "bloqueada" || st === "cancelada") return "bloqueada";
  if (st === "expirada") return "expirada";
  if (exp !== null && exp < Date.now()) return "expirada";
  if (st === "teste" || st === "trial" || (l.tipo ?? "").toLowerCase() === "trial") return "teste";
  if (st === "ativa") return "ativa";
  if (!l.ativada_em || st === "pendente" || st === "aguardando") return "aguardando";
  return "ativa";
}

type FilterKey =
  | "todos"
  | "ativos"
  | "teste"
  | "expirados"
  | "bloqueados"
  | "sem_ativacao"
  | "com_compras"
  | "sem_compras";

const FILTERS: { key: FilterKey; label: string; icon: any; color: string }[] = [
  { key: "todos",         label: "Todos",           icon: Filter,          color: "var(--brand-violet)" },
  { key: "ativos",        label: "Ativos",          icon: ShieldCheck,     color: "var(--brand-emerald)" },
  { key: "teste",         label: "Em teste",        icon: FlaskConical,    color: "var(--brand-blue)" },
  { key: "expirados",     label: "Expirados",       icon: CalendarClock,   color: "oklch(0.65 0.02 250)" },
  { key: "bloqueados",    label: "Bloqueados",      icon: Ban,             color: "oklch(0.7 0.22 25)" },
  { key: "sem_ativacao",  label: "Sem ativação",    icon: Clock,           color: "oklch(0.82 0.17 90)" },
  { key: "com_compras",   label: "Com compras",     icon: DollarSign,      color: "var(--brand-emerald)" },
  { key: "sem_compras",   label: "Sem compras",     icon: DollarSign,      color: "var(--brand-cyan)" },
];

function AdminClientesPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterKey>("todos");

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["admin", "clientes", "cards"],
    queryFn: async (): Promise<Cliente[]> => {
      const { data, error } = await (supabase as any)
        .from("clientes")
        .select(
          "id, nome, email, telefone, whatsapp, cpf, empresa, created_at, revendedor_id, revendedores:revendedor_id(nome), licencas:licencas(id, chave, status, ativada_em, created_at, expira_em, tipo)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Cliente[];
    },
    staleTime: 30_000,
  });

  const { data: gastoById = {} } = useQuery({
    queryKey: ["admin", "clientes", "valor-gasto", clientes.length],
    enabled: clientes.length > 0,
    queryFn: () =>
      fetchGastoMapForClientes(
        clientes.map((c) => ({ id: c.id, nome: c.nome, email: c.email })),
      ),
    staleTime: 60_000,
  });

  // Server-side fallback: quando o termo parece chave de licença ou id de pedido,
  // resolve cliente_ids a partir de tabelas relacionadas.
  const looksLikeKey = /[A-Z0-9]{3,}-[A-Z0-9]{3,}/i.test(q);
  const { data: extraIds = new Set<string>() } = useQuery({
    queryKey: ["admin", "clientes", "search-extra", q],
    enabled: q.trim().length >= 4,
    queryFn: async (): Promise<Set<string>> => {
      const term = `%${q.trim()}%`;
      const ids = new Set<string>();
      // por chave de licença
      const { data: lics } = await (supabase as any)
        .from("licencas")
        .select("cliente_id")
        .ilike("chave", term)
        .not("cliente_id", "is", null)
        .limit(50);
      for (const r of (lics ?? []) as any[]) if (r.cliente_id) ids.add(r.cliente_id);
      // por id externo de pagamento (fallback: se termo é UUID/parcial em id/external_id, o mapping é por cliente_nome — vem no gasto map, então não recomputamos aqui)
      return ids;
    },
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return clientes.filter((c) => {
      // filtro por termo
      if (s) {
        const hay = [
          c.nome, c.email, c.telefone, c.whatsapp, c.cpf, c.empresa,
          c.revendedores?.nome,
          ...(c.licencas ?? []).map((l) => l.chave ?? ""),
        ].filter(Boolean).join(" ").toLowerCase();
        const matches = hay.includes(s) || extraIds.has(c.id);
        if (!matches) return false;
      }
      // filtro por status
      if (filter === "todos") return true;
      const lics = c.licencas ?? [];
      const gasto = gastoById[c.id] ?? 0;
      if (filter === "com_compras") return gasto > 0;
      if (filter === "sem_compras") return !gasto;
      const kinds = new Set(lics.map(classify));
      if (filter === "ativos") return kinds.has("ativa");
      if (filter === "teste") return kinds.has("teste");
      if (filter === "expirados") return kinds.has("expirada");
      if (filter === "bloqueados") return kinds.has("bloqueada");
      if (filter === "sem_ativacao") return lics.length === 0 || kinds.has("aguardando");
      return true;
    });
  }, [clientes, q, filter, extraIds, gastoById]);

  function rowsForExport() {
    return filtered.map((c) => {
      const lics = c.licencas ?? [];
      const b = { ativa: 0, aguardando: 0, teste: 0, bloqueada: 0, expirada: 0 };
      for (const l of lics) b[classify(l)]++;
      return {
        Nome: c.nome ?? "",
        Email: c.email ?? "",
        Telefone: c.telefone ?? c.whatsapp ?? "",
        Empresa: c.empresa ?? "",
        CPF: c.cpf ?? "",
        Revendedor: c.revendedores?.nome ?? "",
        "Total licenças": lics.length,
        Ativas: b.ativa,
        Teste: b.teste,
        Aguardando: b.aguardando,
        Bloqueadas: b.bloqueada,
        Expiradas: b.expirada,
        "Valor gasto": gastoById[c.id] ?? 0,
        Cadastro: c.created_at ?? "",
      };
    });
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Admin</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
            <span className="gradient-text-warm">Clientes</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {clientes.length} cliente(s) · {filtered.length} exibido(s)
          </p>
        </div>
        <div className="flex gap-1.5">
          <ExportBtn label="CSV" onClick={() => exportCsv("clientes", rowsForExport())} />
          <ExportBtn label="Excel" onClick={() => exportXlsx("clientes", rowsForExport())} />
          <ExportBtn label="PDF" onClick={() => exportPdf("clientes", "Clientes", rowsForExport())} />
        </div>
      </header>

      <label className="glass relative flex h-12 w-full items-center rounded-2xl pl-11 pr-4">
        <Search className="absolute left-4 size-4 text-muted-foreground" strokeWidth={2} />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, email, telefone, empresa, CPF, licença ou revendedor..."
          className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
        />
      </label>

      {/* Filtros */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const Icon = f.icon;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors",
                active
                  ? "border-white/30 bg-white/[0.08] text-foreground"
                  : "border-border/60 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.04]",
              )}
              style={active ? { color: f.color, borderColor: `color-mix(in oklab, ${f.color} 50%, transparent)` } : undefined}
            >
              <Icon className="size-3.5" style={{ color: f.color }} />
              {f.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="glass flex items-center justify-center rounded-2xl px-6 py-14 text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" /> Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl px-6 py-14 text-center text-sm text-muted-foreground">
          Nenhum cliente encontrado.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const licencas = c.licencas ?? [];
            const buckets = { ativa: 0, aguardando: 0, teste: 0, bloqueada: 0, expirada: 0 };
            let ultimaCompra: string | null = null;
            for (const l of licencas) {
              buckets[classify(l)]++;
              const t = l.created_at;
              if (t && (!ultimaCompra || new Date(t) > new Date(ultimaCompra))) ultimaCompra = t;
            }
            const gasto = gastoById[c.id] ?? null;
            return (
              <ClienteCard
                key={c.id}
                id={c.id}
                nome={c.nome ?? "—"}
                email={c.email ?? "—"}
                total={licencas.length}
                ativas={buckets.ativa}
                aguardando={buckets.aguardando}
                bloqueadas={buckets.bloqueada + buckets.expirada}
                ultimaCompra={ultimaCompra}
                revendedor={c.revendedores?.nome ?? null}
                valorGasto={gasto}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ExportBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/60 bg-white/[0.02] px-3 text-xs hover:bg-white/[0.06]"
    >
      <FileDown className="size-3.5" /> {label}
    </button>
  );
}

function ClienteCard(props: {
  id: string;
  nome: string;
  email: string;
  total: number;
  ativas: number;
  aguardando: number;
  bloqueadas: number;
  ultimaCompra: string | null;
  revendedor: string | null;
  valorGasto: number | null;
}) {
  const initial = (props.nome || props.email || "?").charAt(0).toUpperCase();
  return (
    <article
      className="glass group relative overflow-hidden rounded-2xl p-5 transition-all hover:-translate-y-0.5"
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      <div className="flex items-start gap-4">
        <div
          className="grid size-14 shrink-0 place-items-center rounded-2xl text-xl font-semibold text-white"
          style={{
            background: "linear-gradient(135deg, var(--brand-magenta), var(--brand-orange))",
            boxShadow: "0 0 24px -4px color-mix(in oklab, var(--brand-magenta) 60%, transparent)",
          }}
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold">{props.nome}</h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{props.email}</p>
        </div>
      </div>

      <ul className="mt-4 space-y-1.5 border-t border-border/50 pt-3 text-xs">
        <Row icon={KeyRound} color="var(--brand-violet)" label={`${props.total} licença(s)`} />
        <Row icon={ShieldCheck} color="var(--brand-emerald)" label={`${props.ativas} ativa(s)`} />
        <Row icon={Clock} color="oklch(0.78 0.19 75)" label={`${props.aguardando} aguardando ativação`} />
        <Row icon={Ban} color="oklch(0.72 0.2 25)" label={`${props.bloqueadas} bloqueada(s)`} />
      </ul>

      <ul className="mt-3 space-y-1.5 border-t border-border/50 pt-3 text-xs text-muted-foreground">
        <Row
          icon={Calendar}
          color="var(--brand-blue)"
          label={<>Última compra: <span className="text-foreground">{props.ultimaCompra ? new Date(props.ultimaCompra).toLocaleDateString("pt-BR") : "—"}</span></>}
        />
        <Row
          icon={Store}
          color="var(--brand-cyan)"
          label={<>Revendedor: <span className="text-foreground">{props.revendedor ?? "—"}</span></>}
        />
        <Row
          icon={DollarSign}
          color="var(--brand-emerald)"
          label={<>Valor gasto: <span className="text-foreground">{props.valorGasto != null ? brl(props.valorGasto) : "—"}</span></>}
        />
      </ul>

      <Link
        to="/admin/clientes/$id"
        params={{ id: props.id }}
        className={cn(
          "mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium",
          "border border-border/60 bg-white/[0.02] transition-colors hover:bg-white/[0.06]",
        )}
      >
        Abrir Cliente <ArrowRight className="size-4" />
      </Link>
    </article>
  );
}

function Row({
  icon: Icon, color, label,
}: { icon: any; color: string; label: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <Icon className="size-3.5 shrink-0" style={{ color }} strokeWidth={2} />
      <span className="truncate">{label}</span>
    </li>
  );
}
