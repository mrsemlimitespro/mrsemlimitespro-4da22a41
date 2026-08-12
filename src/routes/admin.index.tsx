import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users,
  Store,
  KeyRound,
  Package,
  DollarSign,
  TrendingUp,
  Activity,
  ArrowRight,
  Clock,
  Blocks,
  Smartphone,
  ShieldAlert,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getDashboardStats } from "@/lib/admin/dashboard.functions";

export const Route = createFileRoute("/admin/")({
  component: AdminControlCenter,
});

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

type KpiCfg = {
  key: string;
  label: string;
  icon: IconType;
  color: string;
  to: string;
  value: string | number;
  hint?: string;
};

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function KpiCard({ cfg }: { cfg: KpiCfg }) {
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
          {cfg.value}
        </div>
        {cfg.hint && (
          <div className="text-[11px] text-muted-foreground/80">{cfg.hint}</div>
        )}
      </div>
    </Link>
  );
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

function AdminControlCenter() {
  const fetchStats = useServerFn(getDashboardStats);
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: () => fetchStats(),
    staleTime: 60_000,
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["admin-latest-clientes"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("clientes").select("id, nome, email, created_at").order("created_at", { ascending: false }).limit(6);
      return data || [];
    }
  });

  const { data: revendedores = [] } = useQuery({
    queryKey: ["admin-latest-revendedores"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("revendedores").select("id, nome, email, created_at").order("created_at", { ascending: false }).limit(6);
      return data || [];
    }
  });

  const { data: licencas = [] } = useQuery({
    queryKey: ["admin-latest-licencas"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("licencas").select("id, chave, status, created_at").order("created_at", { ascending: false }).limit(6);
      return data || [];
    }
  });

  const KPIS: KpiCfg[] = [
    {
      key: "clientes",
      label: "Clientes",
      icon: Users,
      color: "#10b981",
      to: "/admin/clientes",
      value: statsLoading ? "…" : (stats?.clientes ?? 0),
    },
    {
      key: "revendedores",
      label: "Revendedores",
      icon: Store,
      color: "#3b82f6",
      to: "/admin/revendedores-gestao",
      value: statsLoading ? "…" : (stats?.revendedores ?? 0),
    },
    {
      key: "extensoes",
      label: "Extensões",
      icon: Blocks,
      color: "#d946ef",
      to: "/admin/extensoes",
      value: statsLoading ? "…" : (stats?.extensoes ?? 0),
    },
    {
      key: "licencas",
      label: "Licenças Ativas",
      icon: KeyRound,
      color: "#f59e0b",
      to: "/admin/licencas",
      value: statsLoading ? "…" : (stats?.licencasAtivas ?? 0),
    },
    {
      key: "dispositivos",
      label: "Dispositivos",
      icon: Smartphone,
      color: "#6366f1",
      to: "/admin/dispositivos",
      value: statsLoading ? "…" : (stats?.dispositivos ?? 0),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="space-y-1">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          MR CENTRAL V2
        </div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          <span className="gradient-text-warm">Dashboard Ultra Admin</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Gestão profissional do ecossistema de extensões e licenciamento.
        </p>
      </header>

      {/* KPIs */}
      <section className="space-y-3">
        <div className={cn("grid gap-3", "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5")}>
          {KPIS.map((k) => (
            <KpiCard key={k.key} cfg={k} />
          ))}
        </div>
      </section>

      {/* Monitoramento */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Atividade em Tempo Real
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FeedCard
            title="Últimos clientes"
            icon={Users}
            items={clientes}
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
            items={revendedores}
            to="/admin/revendedores-gestao"
            render={(c) => ({
              primary: c.nome || c.email || "—",
              secondary: c.email,
              ts: c.created_at,
            })}
          />
          <FeedCard
            title="Últimas ativações"
            icon={KeyRound}
            items={licencas}
            to="/admin/licencas"
            render={(l) => ({
              primary: l.chave || "—",
              secondary: `${l.status || "ativa"}`,
              ts: l.created_at,
            })}
          />
        </div>
      </section>

      <footer className="flex flex-wrap gap-4 pt-4 border-t border-white/5">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <ShieldAlert className="size-3 text-brand-magenta" />
          Monitoramento de segurança ativo
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <TrendingUp className="size-3 text-brand-emerald" />
          Dados atualizados via MR CENTRAL API
        </div>
      </footer>
    </div>
  );
}

