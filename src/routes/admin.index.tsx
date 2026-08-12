import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Store,
  Globe2,
  KeyRound,
  Package,
  DollarSign,
  TrendingUp,
  Ticket,
  AlertTriangle,
  Bell,
  Activity,
  ArrowRight,
  Clock,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  component: AdminControlCenter,
});

// ============= Central de Controle =============

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

type KpiCfg = {
  key: string;
  label: string;
  icon: IconType;
  color: string;
  to: string;
  compute: () => Promise<{ value: string | number; hint?: string }>;
};

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

async function countTable(table: string, filter?: (q: any) => any) {
  let q: any = (supabase as any).from(table).select("id", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count } = await q;
  return count ?? 0;
}

async function sumField(table: string, field: string, filter?: (q: any) => any) {
  let q: any = (supabase as any).from(table).select(field);
  if (filter) q = filter(q);
  const { data } = await q;
  return (data ?? []).reduce(
    (acc: number, r: any) => acc + Number(r?.[field] ?? 0),
    0,
  );
}

const startOfDayISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};
const startOfMonthISO = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const KPIS: KpiCfg[] = [
  {
    key: "clientes",
    label: "Clientes",
    icon: Users,
    color: "var(--brand-emerald, oklch(0.75 0.16 155))",
    to: "/admin/clientes",
    compute: async () => ({ value: await countTable("clientes") }),
  },
  {
    key: "revendedores",
    label: "Revendedores",
    icon: Store,
    color: "var(--brand-blue)",
    to: "/admin/revendedores-gestao",
    compute: async () => ({ value: await countTable("revendedores") }),
  },
  {
    key: "visitantes",
    label: "Visitantes (30d)",
    icon: Globe2,
    color: "oklch(0.75 0.02 260)",
    to: "/admin",
    compute: async () => ({ value: "—", hint: "somente leitura" }),
  },
  {
    key: "licencas",
    label: "Licenças",
    icon: KeyRound,
    color: "var(--brand-magenta)",
    to: "/admin/licencas",
    compute: async () => ({ value: await countTable("licencas") }),
  },
  {
    key: "packs",
    label: "Packs",
    icon: Package,
    color: "var(--brand-orange)",
    to: "/admin/premium-packs",
    compute: async () => ({ value: await countTable("premium_packs") }),
  },
  {
    key: "receita-hoje",
    label: "Receita hoje",
    icon: DollarSign,
    color: "var(--brand-emerald, oklch(0.75 0.16 155))",
    to: "/admin/pagamentos",
    compute: async () => {
      const v = await sumField("pagamentos", "valor", (q) =>
        q.gte("created_at", startOfDayISO()).eq("status", "pago"),
      );
      return { value: brl(v) };
    },
  },
  {
    key: "receita-mes",
    label: "Receita mês",
    icon: TrendingUp,
    color: "var(--brand-orange)",
    to: "/admin/pagamentos",
    compute: async () => {
      const v = await sumField("pagamentos", "valor", (q) =>
        q.gte("created_at", startOfMonthISO()).eq("status", "pago"),
      );
      return { value: brl(v) };
    },
  },
  {
    key: "promocoes",
    label: "Promoções ativas",
    icon: Ticket,
    color: "var(--brand-magenta)",
    to: "/admin/promocoes",
    compute: async () => ({
      value: await countTable("promocoes", (q) => q.eq("ativo", true)),
    }),
  },
  {
    key: "expirando",
    label: "Licenças expirando",
    icon: AlertTriangle,
    color: "oklch(0.78 0.19 75)",
    to: "/admin/licencas",
    compute: async () => {
      const in7 = new Date();
      in7.setDate(in7.getDate() + 7);
      return {
        value: await countTable("licencas", (q) =>
          q.lte("expira_em", in7.toISOString()).gte("expira_em", new Date().toISOString()),
        ),
        hint: "próximos 7 dias",
      };
    },
  },
  {
    key: "alertas",
    label: "Alertas",
    icon: Bell,
    color: "oklch(0.72 0.2 25)",
    to: "/admin/notificacoes",
    compute: async () => ({
      value: await countTable("notificacoes", (q) => q.is("lida_em", null)),
    }),
  },
];

function KpiCard({ cfg }: { cfg: KpiCfg }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-kpi", cfg.key],
    queryFn: cfg.compute,
    staleTime: 30_000,
  });
  const Icon = cfg.icon;
  return (
    <Link
      to={cfg.to as never}
      className="glass group relative flex flex-col gap-3 overflow-hidden rounded-2xl p-4 transition-all hover:-translate-y-0.5"
      style={{ boxShadow: `0 0 30px -18px ${cfg.color}` }}
    >
      <div className="flex items-center justify-between">
        <span
          className="icon-tile grid size-10 place-items-center rounded-xl"
          style={{
            background: `color-mix(in oklab, ${cfg.color} 22%, transparent)`,
            color: cfg.color,
          }}
        >
          <Icon className="size-5" />
        </span>
        <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{cfg.label}</div>
        <div className="mt-0.5 text-2xl font-semibold tracking-tight">
          {isLoading ? "…" : (data?.value ?? "—")}
        </div>
        {data?.hint && (
          <div className="text-[11px] text-muted-foreground/80">{data.hint}</div>
        )}
      </div>
    </Link>
  );
}

// ============= Feeds de monitoramento =============

function useLatest<T = any>(
  table: string,
  select: string,
  limit = 6,
): { data: T[]; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-latest", table, select, limit],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from(table)
        .select(select)
        .order("created_at", { ascending: false })
        .limit(limit);
      return (data ?? []) as T[];
    },
    staleTime: 30_000,
  });
  return { data: data ?? [], isLoading };
}

function timeAgo(iso: string | null | undefined) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

function FeedCard({
  title,
  icon: Icon,
  items,
  render,
  to,
  empty = "Nada por aqui.",
}: {
  title: string;
  icon: IconType;
  items: any[];
  render: (it: any) => { primary: string; secondary?: string; ts?: string };
  to?: string;
  empty?: string;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 text-muted-foreground" />
          <span>{title}</span>
        </div>
        {to && (
          <Link
            to={to as never}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            ver tudo →
          </Link>
        )}
      </div>
      {items.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it, i) => {
            const r = render(it);
            return (
              <li
                key={i}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-white/[0.03]"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.primary}</div>
                  {r.secondary && (
                    <div className="truncate text-[11px] text-muted-foreground">
                      {r.secondary}
                    </div>
                  )}
                </div>
                {r.ts && (
                  <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="size-3" />
                    {timeAgo(r.ts)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AdminControlCenter() {
  const clientes = useLatest<any>("clientes", "id, nome, email, created_at");
  const revendedores = useLatest<any>("revendedores", "id, nome, email, created_at");
  const pagamentos = useLatest<any>(
    "pagamentos",
    "id, valor, status, cliente_email, created_at",
  );
  const licencas = useLatest<any>("licencas", "id, chave, plano, status, created_at");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="space-y-1">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Painel Administrativo
        </div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          <span className="gradient-text-warm">Central de Controle</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Visão consolidada de usuários, receita, licenças e atividade do sistema.
        </p>
      </header>

      {/* KPIs */}
      <section aria-labelledby="kpis-heading" className="space-y-3">
        <h2 id="kpis-heading" className="sr-only">
          Indicadores
        </h2>
        <div className={cn("grid gap-3", "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5")}>
          {KPIS.map((k) => (
            <KpiCard key={k.key} cfg={k} />
          ))}
        </div>
      </section>

      {/* Monitoramento */}
      <section aria-labelledby="mon-heading" className="space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-muted-foreground" />
          <h2 id="mon-heading" className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Centro de Monitoramento
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FeedCard
            title="Últimos clientes"
            icon={Users}
            items={clientes.data}
            to="/admin/clientes"
            render={(c) => ({
              primary: c.nome || c.email || "—",
              secondary: c.email,
              ts: c.created_at,
            })}
          />
          <FeedCard
            title="Últimos revendedores"
            icon={Store}
            items={revendedores.data}
            to="/admin/revendedores-gestao"
            render={(c) => ({
              primary: c.nome || c.email || "—",
              secondary: c.email,
              ts: c.created_at,
            })}
          />
          <FeedCard
            title="Últimas vendas"
            icon={DollarSign}
            items={pagamentos.data}
            to="/admin/pagamentos"
            render={(p) => ({
              primary: brl(Number(p.valor ?? 0)),
              secondary: `${p.cliente_email ?? "—"} · ${p.status ?? ""}`,
              ts: p.created_at,
            })}
          />
          <FeedCard
            title="Últimas ativações"
            icon={KeyRound}
            items={licencas.data}
            to="/admin/licencas"
            render={(l) => ({
              primary: l.chave || "—",
              secondary: `${l.plano ?? ""} · ${l.status ?? ""}`,
              ts: l.created_at,
            })}
          />
        </div>
      </section>

      <p className="text-[11px] text-muted-foreground/70">
        Todos os feeds são somente leitura. Clique em qualquer card para abrir a tela
        correspondente.
      </p>
    </div>
  );
}
