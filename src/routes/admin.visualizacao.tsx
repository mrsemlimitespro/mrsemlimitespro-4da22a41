import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Eye, Loader2, Search, Users, UserCog } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setImpersonation, type ImpersonationTargetKind } from "@/lib/impersonation";

export const Route = createFileRoute("/admin/visualizacao")({
  head: () => ({
    meta: [
      { title: "Visualização — Painel Administrativo" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: VisualizacaoPage,
});

type Row = {
  id: string;
  nome: string | null;
  email: string | null;
  status: string | null;
};

function VisualizacaoPage() {
  const [tab, setTab] = useState<ImpersonationTargetKind>("revendedor");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Área do Administrador
        </div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          <span className="gradient-text-warm">Visualização</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Abra o painel de um Revendedor ou Cliente em <strong>modo somente leitura</strong>.
          Nenhuma alteração é feita — o Administrador continua como Administrador.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <SelectorCard
          active={tab === "revendedor"}
          onClick={() => setTab("revendedor")}
          icon={UserCog}
          emoji="🏪"
          title="Revendedores"
          hint="Ver painel comercial completo"
          glow="var(--brand-blue)"
        />
        <SelectorCard
          active={tab === "cliente"}
          onClick={() => setTab("cliente")}
          icon={Users}
          emoji="👤"
          title="Clientes"
          hint="Ver painel do cliente final"
          glow="var(--brand-emerald)"
        />
      </div>

      <ListSection kind={tab} />
    </div>
  );
}

function SelectorCard({
  active,
  onClick,
  icon: Icon,
  emoji,
  title,
  hint,
  glow,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  emoji: string;
  title: string;
  hint: string;
  glow: string;
}) {
  return (
    <button
      type="button"
      data-impersonation-safe="1"
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-5 text-left transition-all",
        "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
        active && "border-transparent",
      )}
      style={
        active
          ? {
              boxShadow: `0 0 0 1px color-mix(in oklab, ${glow} 60%, transparent), 0 12px 40px -12px color-mix(in oklab, ${glow} 55%, transparent)`,
              background: `linear-gradient(135deg, color-mix(in oklab, ${glow} 14%, transparent), color-mix(in oklab, ${glow} 4%, transparent))`,
            }
          : undefined
      }
    >
      <div className="flex items-center gap-3">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-2xl text-xl"
          style={{
            background: `color-mix(in oklab, ${glow} 25%, oklch(0 0 0 / 30%))`,
            boxShadow: `0 0 20px -4px color-mix(in oklab, ${glow} 55%, transparent)`,
          }}
        >
          <span aria-hidden>{emoji}</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        </div>
        <Icon className="size-4 shrink-0 text-muted-foreground" />
      </div>
    </button>
  );
}

function ListSection({ kind }: { kind: ImpersonationTargetKind }) {
  const table = kind === "revendedor" ? "revendedores" : "clientes";
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-visualizacao", table, debounced, statusFilter],
    queryFn: async () => {
      let q = (supabase as any)
        .from(table)
        .select("id, nome, email, status")
        .order("created_at", { ascending: false })
        .limit(100);
      if (debounced) {
        const term = debounced.replace(/[%,]/g, "");
        q = q.or(`nome.ilike.%${term}%,email.ilike.%${term}%`);
      }
      if (statusFilter) q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    staleTime: 10_000,
  });

  const rows = data ?? [];

  const statusOptions = useMemo(
    () =>
      kind === "revendedor"
        ? [
            { value: "", label: "Todos" },
            { value: "ativo", label: "Ativo" },
            { value: "inativo", label: "Inativo" },
            { value: "pendente", label: "Pendente" },
          ]
        : [
            { value: "", label: "Todos" },
            { value: "ativo", label: "Ativo" },
            { value: "inativo", label: "Inativo" },
            { value: "bloqueado", label: "Bloqueado" },
          ],
    [kind],
  );

  return (
    <section className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="glass flex h-11 items-center gap-3 rounded-2xl px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="search"
            placeholder={`Buscar ${kind === "revendedor" ? "revendedor" : "cliente"}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
          />
        </label>

        <div className="flex gap-2 overflow-x-auto">
          {statusOptions.map((o) => (
            <button
              key={o.value || "all"}
              type="button"
              data-impersonation-safe="1"
              onClick={() => setStatusFilter(o.value)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                statusFilter === o.value
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead className="border-b border-white/5 bg-white/[0.02] text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="w-40 px-4 py-3 text-right font-medium">Ação</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-sm text-red-300">
                  Falha ao carregar: {(error as Error).message}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-10 text-center text-sm text-muted-foreground">
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              rows.map((row) => <VisualizarRow key={row.id} row={row} kind={kind} />)
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function VisualizarRow({ row, kind }: { row: Row; kind: ImpersonationTargetKind }) {
  const navigate = useNavigate();
  return (
    <tr className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
      <td className="px-4 py-3 font-medium">{row.nome ?? "—"}</td>
      <td className="px-4 py-3 text-muted-foreground">{row.email ?? "—"}</td>
      <td className="px-4 py-3">
        <span className="inline-flex rounded-full bg-white/5 px-2 py-0.5 text-xs capitalize text-muted-foreground">
          {row.status ?? "—"}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          size="sm"
          data-impersonation-safe="1"
          onClick={async () => {
            const { data } = await supabase.auth.getUser();
            setImpersonation(
              {
                kind,
                id: row.id,
                name: row.nome ?? "—",
                email: row.email ?? "",
                returnTo: "/admin/visualizacao",
              },
              { adminEmail: data.user?.email ?? null },
            );
            navigate({ to: kind === "revendedor" ? "/dashboard" : "/" });
          }}
          className="gap-1.5"
        >
          <Eye className="size-3.5" /> Visualizar Painel
        </Button>
      </td>
    </tr>
  );
}
