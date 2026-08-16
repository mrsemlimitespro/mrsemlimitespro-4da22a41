import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, ShieldAlert, ShieldCheck, ShieldX, Smartphone, TrendingUp, KeyRound, RotateCcw, Bug } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type TamperEvent = {
  id: string;
  licenca_id: string;
  tipo: string;
  mensagem: string | null;
  device_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  licencas?: { chave: string | null; email: string | null } | null;
};

async function fetchTamperEvents(): Promise<TamperEvent[]> {
  const { data } = await supabase
    .from("licencas_eventos")
    .select("id, licenca_id, tipo, mensagem, device_id, metadata, created_at, licencas:licenca_id(chave, email)")
    .like("tipo", "tamper:%")
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as TamperEvent[];
}

export const Route = createFileRoute("/admin/licencas-dashboard")({
  component: LicencasDashboard,
});

type Metrics = {
  total: number;
  ativas: number;
  expiradas: number;
  bloqueadas: number;
  dispositivos: number;
  ativacoesHoje: number;
  renovacoesHoje: number;
  resetsPendentes: number;
};

async function fetchMetrics(): Promise<Metrics> {
  const [total, ativas, expiradas, bloqueadas, dispositivos, ativacoesHoje, renovacoesHoje, resetsPendentes] =
    await Promise.all([
      supabase.from("licencas").select("id", { count: "exact", head: true }),
      supabase.from("licencas").select("id", { count: "exact", head: true }).eq("status", "ativa"),
      supabase.from("licencas").select("id", { count: "exact", head: true }).eq("status", "expirada"),
      supabase
        .from("licencas")
        .select("id", { count: "exact", head: true })
        .in("status", ["bloqueada", "cancelada", "revogada"]),
      supabase.from("licenca_dispositivos").select("id", { count: "exact", head: true }),
      supabase
        .from("licencas_eventos")
        .select("id", { count: "exact", head: true })
        .eq("tipo", "ativada")
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      supabase
        .from("licencas_eventos")
        .select("id", { count: "exact", head: true })
        .eq("tipo", "renovada")
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      supabase
        .from("licencas")
        .select("id", { count: "exact", head: true })
        .not("reset_hwid_solicitado_em", "is", null),
    ]);

  return {
    total: total.count ?? 0,
    ativas: ativas.count ?? 0,
    expiradas: expiradas.count ?? 0,
    bloqueadas: bloqueadas.count ?? 0,
    dispositivos: dispositivos.count ?? 0,
    ativacoesHoje: ativacoesHoje.count ?? 0,
    renovacoesHoje: renovacoesHoje.count ?? 0,
    resetsPendentes: resetsPendentes.count ?? 0,
  };
}

function LicencasDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["licencas-dashboard"], queryFn: fetchMetrics });
  const { data: tampers = [] } = useQuery({ queryKey: ["licencas-tamper-events"], queryFn: fetchTamperEvents, refetchInterval: 15_000 });
  const qc = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Realtime: refetch com debounce quando qualquer licença/pagamento muda.
  useEffect(() => {
    const invalidate = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["licencas-dashboard"] });
      }, 400);
    };
    const channel = supabase
      .channel("admin-licencas-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "licencas" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_transactions" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "clientes" }, invalidate)
      .subscribe();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const cards: Array<{ label: string; value: number; icon: React.ComponentType<{ className?: string }>; tone: string }> = [
    { label: "Total de licenças", value: data?.total ?? 0, icon: KeyRound, tone: "from-violet-500/25 to-blue-500/20" },
    { label: "Ativas", value: data?.ativas ?? 0, icon: ShieldCheck, tone: "from-emerald-500/25 to-teal-500/15" },
    { label: "Expiradas", value: data?.expiradas ?? 0, icon: ShieldAlert, tone: "from-amber-500/25 to-orange-500/15" },
    { label: "Bloqueadas / revogadas", value: data?.bloqueadas ?? 0, icon: ShieldX, tone: "from-rose-500/25 to-red-500/15" },
    { label: "Dispositivos conectados", value: data?.dispositivos ?? 0, icon: Smartphone, tone: "from-fuchsia-500/25 to-violet-500/15" },
    { label: "Ativações hoje", value: data?.ativacoesHoje ?? 0, icon: Activity, tone: "from-sky-500/25 to-cyan-500/15" },
    { label: "Renovações hoje", value: data?.renovacoesHoje ?? 0, icon: TrendingUp, tone: "from-lime-500/25 to-emerald-500/15" },
    { label: "Resets HWID pendentes", value: data?.resetsPendentes ?? 0, icon: RotateCcw, tone: "from-orange-500/25 to-pink-500/15" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="space-y-1">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Licenciamento</div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          <span className="gradient-text-warm">Dashboard de Licenças</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Visão consolidada do servidor de licenças MR LOV 2.2.
        </p>
      </header>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`glass rounded-2xl p-5 relative overflow-hidden bg-gradient-to-br ${c.tone}`}
          >
            <div className="flex items-start justify-between">
              <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{c.label}</div>
              <c.icon className="size-4 text-foreground/70" />
            </div>
            <div className="mt-3 text-3xl font-semibold tabular-nums">
              {isLoading ? "…" : c.value.toLocaleString("pt-BR")}
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bug className="size-4 text-rose-400" />
            <h2 className="text-lg font-semibold">Alertas de violação (anti-tamper)</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {tampers.length} evento(s) recente(s) · admin com bypass total
          </span>
        </div>
        {tampers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma tentativa de inspeção detectada. A extensão reporta automaticamente F12,
            DevTools, integridade e repack — 3 sinais em 24h bloqueiam a licença.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {tampers.map((ev) => {
              const signal = ev.tipo.replace(/^tamper:/, "");
              const chave = ev.licencas?.chave ?? "—";
              return (
                <li key={ev.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-rose-500/15 text-rose-300 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                        {signal}
                      </span>
                      <span className="font-mono text-xs truncate">
                        {chave.slice(0, 8)}…{chave.slice(-4)}
                      </span>
                      {ev.licencas?.email ? (
                        <span className="text-muted-foreground truncate">· {ev.licencas.email}</span>
                      ) : null}
                    </div>
                    {ev.mensagem ? (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">{ev.mensagem}</div>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(ev.created_at), { locale: ptBR, addSuffix: true })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-2">Endpoints públicos ativos</h2>
        <ul className="grid gap-1.5 text-sm font-mono text-muted-foreground">
          <li>POST /api/public/validar-licenca</li>
          <li>POST /api/public/licenca/heartbeat</li>
          <li>GET&nbsp;&nbsp;/api/public/licenca/consulta?chave=…</li>
          <li>POST /api/public/licenca/renovar</li>
          <li>POST /api/public/licenca/reset-hwid</li>
          <li>POST /api/public/licenca/revogar</li>
          <li>GET&nbsp;&nbsp;/api/public/licenca/config</li>
          <li>POST /api/public/ext/functions/v1/report-tamper</li>
        </ul>
      </div>
    </div>
  );
}
