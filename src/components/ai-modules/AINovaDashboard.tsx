import * as React from "react";
import {
  Bell,
  Sparkles,
  Command,
  Plus,
  FileBarChart,
  Link2,
  Zap,
  Users,
  Target,
  Star,
  Home,
  FolderOpen,
  MessageCircle,
  User,
  ChevronDown,
  MoreHorizontal,
  Layers,
  Bot,
  Wand2,
  Eye,
  Copy,
  Download,
  RefreshCw,
  Package,
  Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIModuleTheme } from "./AIModuleShell";
import type { AINovaStats } from "@/lib/ai-modules/dashboard.functions";

/**
 * AINovaDashboard — Dashboard interno NovaMind para AI Prompts / AI Agents.
 * Renderiza dados REAIS do painel quando `stats` é fornecido.
 * Copiado verbatim do projeto Link MR Store Pro.
 */

export interface AINovaDashboardProps {
  theme: AIModuleTheme;
  brand: string;
  userName?: string;
  userOrg?: string;
  greetingSub?: string;
  onOpenLibrary?: () => void;
  onCreate?: () => void;
  stats?: AINovaStats | null;
  loading?: boolean;
  className?: string;
}

const ACTION_LABELS: Record<
  string,
  {
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
    tone: "emerald" | "blue" | "amber" | "violet";
  }
> = {
  open: { label: "Prompt aberto", Icon: Eye, tone: "blue" },
  copy: { label: "Prompt copiado", Icon: Copy, tone: "emerald" },
  download: { label: "Prompt baixado", Icon: Download, tone: "amber" },
  updated: { label: "Atualizado", Icon: RefreshCw, tone: "violet" },
};

function fmtInt(n: number) {
  return new Intl.NumberFormat("pt-BR").format(n);
}

function fmtDelta(n: number, base: number) {
  if (!base) return { value: "+0%", tone: "up" as const };
  const pct = (n / base) * 100;
  const sign = pct >= 0 ? "+" : "";
  return {
    value: `${sign}${pct.toFixed(1)}%`,
    tone: pct >= 0 ? ("up" as const) : ("down" as const),
  };
}

function relTime(iso: string) {
  const t = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - t);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

function buildSparkPath(counts: number[]) {
  if (!counts.length) return "M0 28 L100 28";
  const max = Math.max(1, ...counts);
  const step = 100 / Math.max(1, counts.length - 1);
  return counts
    .map((c, i) => {
      const x = i * step;
      const y = 32 - (c / max) * 28 - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function AINovaDashboard({
  theme,
  brand,
  userName = "você",
  userOrg = "MR SEM LIMITES",
  greetingSub,
  onOpenLibrary,
  onCreate,
  stats,
  loading,
  className,
}: AINovaDashboardProps) {
  const isPrompts = theme === "prompts";
  const isPacks = theme === "packs";
  const weeklyCounts = (stats?.weekly ?? []).map((w) => w.count);
  const sparkAll = buildSparkPath(weeklyCounts);
  const topCats = stats?.topCategorias ?? [];

  const k1 = stats?.total ?? 0;
  const k2 = stats?.totalUsos ?? 0;
  const k3 = stats?.destaques ?? 0;
  const k4 = stats?.favoritos ?? 0;
  const novos = stats?.novosSemana ?? 0;
  const novosDelta = fmtDelta(novos, Math.max(1, (stats?.total ?? 0) - novos));

  const HeroIcon = isPrompts ? Wand2 : isPacks ? Package : Bot;
  const createLabel = isPrompts ? "Novo prompt" : isPacks ? "Novo pack" : "Novo agente";
  const totalLabel = isPrompts
    ? "Total de Prompts"
    : isPacks
      ? "Total de Packs"
      : "Total de Agents";
  const totalUsosLabel = isPacks ? "Total de Downloads" : "Total de Usos";
  const recentsLabel = isPrompts
    ? "Prompts Recentes"
    : isPacks
      ? "Packs Recentes"
      : "Agents Recentes";
  const fourthKpiLabel = isPrompts ? "Favoritos" : "Categorias";

  const greeting =
    greetingSub ??
    (isPrompts
      ? "Bem-vindo ao AI Prompts. Sua central criativa com prompts profissionais prontos para gerar textos, imagens, vídeos, campanhas e roteiros — copie, personalize e acelere qualquer ideia em segundos."
      : isPacks
        ? "Bem-vindo aos Packs Premium. Coleções exclusivas de conteúdo, ferramentas e recursos prontos para acelerar seus projetos — baixe, importe e monetize em segundos com acesso vitalício."
        : "Bem-vindo ao AI Agents. Agentes inteligentes que automatizam tarefas, respondem clientes, geram conteúdo e operam fluxos completos — sua equipe digital trabalhando 24/7 no piloto automático.");

  return (
    <div
      data-ai-theme={theme}
      className={cn(
        "ai-nova relative w-full overflow-hidden rounded-3xl",
        "bg-[#06030f] text-white",
        "border border-white/[0.06]",
        className,
      )}
    >
      <Aurora />

      <header className="relative z-10 flex items-center justify-between gap-4 px-5 sm:px-8 pt-5">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-ai-400 to-ai-600 shadow-[0_0_24px_-4px_var(--ai-500)]">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold tracking-tight text-white/90">{brand}</span>
        </div>

        <div className="hidden md:flex flex-1 max-w-md mx-auto">
          <div className="flex w-full items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] text-white/40 backdrop-blur-xl">
            <Command className="h-3.5 w-3.5" />
            <span className="font-mono">⌘ K</span>
            <span className="text-white/30">Buscar no {brand}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="relative grid h-9 w-9 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition">
            <Bell className="h-4 w-4 text-white/70" />
            {novos > 0 && (
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-ai-400 shadow-[0_0_8px_var(--ai-500)]" />
            )}
          </button>
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-1 pl-1 pr-3 backdrop-blur-xl">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-ai-500 to-ai-300 text-[11px] font-bold text-black">
              {userName.slice(0, 1).toUpperCase()}
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="text-[12px] font-semibold">{userName}</div>
              <div className="text-[10px] text-white/50">{userOrg}</div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-white/50" />
          </div>
        </div>
      </header>

      <section className="relative z-10 px-5 sm:px-8 pt-8 pb-6">
        <div className="ai-spotlight" aria-hidden />
        {theme === "packs" && (
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <span
              className="ai-gold-particle"
              style={{ width: 6, height: 6, top: "22%", left: "18%", animationDelay: "0s" }}
            />
            <span
              className="ai-gold-particle"
              style={{ width: 4, height: 4, top: "58%", left: "36%", animationDelay: "0.6s" }}
            />
            <span
              className="ai-gold-particle"
              style={{ width: 5, height: 5, top: "12%", left: "62%", animationDelay: "1.1s" }}
            />
            <span
              className="ai-gold-particle"
              style={{ width: 3, height: 3, top: "72%", left: "70%", animationDelay: "1.6s" }}
            />
            <span
              className="ai-gold-particle"
              style={{ width: 6, height: 6, top: "38%", left: "88%", animationDelay: "2.1s" }}
            />
            <span
              className="ai-gold-particle"
              style={{ width: 4, height: 4, top: "80%", left: "22%", animationDelay: "2.6s" }}
            />
            <span
              className="ai-gold-particle"
              style={{ width: 3, height: 3, top: "30%", left: "48%", animationDelay: "0.3s" }}
            />
          </div>
        )}
        <div className="relative grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div className="min-w-0">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Olá, {userName}! <span className="inline-block">👋</span>
            </h1>
            <p className="mt-2 text-sm text-white/60 max-w-2xl leading-relaxed">{greeting}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <HeroButton icon={FolderOpen} onClick={onOpenLibrary}>
                Abrir biblioteca
              </HeroButton>
              <HeroButton icon={Plus} onClick={onCreate}>
                {createLabel}
              </HeroButton>
              <HeroButton icon={FileBarChart}>Relatório</HeroButton>
              <HeroButton icon={Link2}>Integrações</HeroButton>
            </div>
          </div>

          <Orb />
        </div>
      </section>

      <section className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 px-5 sm:px-8">
        <KpiCard
          label={totalLabel}
          value={loading ? "…" : fmtInt(k1)}
          delta={novosDelta.value}
          deltaTone={novosDelta.tone}
          deltaSuffix={`${novos} novos / 7d`}
          icon={HeroIcon}
          iconTone="violet"
          spark={sparkAll}
          sparkColor="var(--ai-400)"
        />
        <KpiCard
          label={totalUsosLabel}
          value={loading ? "…" : fmtInt(k2)}
          delta={k2 > 0 ? "ativo" : "—"}
          deltaTone="up"
          deltaSuffix="acumulado"
          icon={isPacks ? Download : Users}
          iconTone="blue"
          spark={sparkAll}
          sparkColor="#3B82F6"
        />
        <KpiCard
          label="Em Destaque"
          value={loading ? "…" : fmtInt(k3)}
          delta={k1 ? `${((k3 / k1) * 100).toFixed(1)}%` : "0%"}
          deltaTone="up"
          deltaSuffix="do catálogo"
          icon={Target}
          iconTone="magenta"
          spark={sparkAll}
          sparkColor="#D946EF"
        />
        <KpiCard
          label={fourthKpiLabel}
          value={loading ? "…" : fmtInt(isPrompts ? k4 : topCats.length)}
          delta={isPrompts ? (k4 > 0 ? "salvos" : "—") : `${topCats.length} ativas`}
          deltaTone="up"
          deltaSuffix={isPrompts ? "pelos usuários" : "no catálogo"}
          icon={Star}
          iconTone="amber"
          spark={sparkAll}
          sparkColor="#F59E0B"
        />
      </section>

      <section className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 px-5 sm:px-8 mt-4 pb-28">
        <Panel
          title="Atividade Recente"
          right={
            <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300/90">
              <span className="relative grid place-items-center">
                <span className="absolute h-3 w-3 rounded-full bg-emerald-400/30 animate-ping" />
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Ao vivo
            </span>
          }
        >
          {(stats?.activity ?? []).length === 0 ? (
            <EmptyMini>Sem atividade ainda.</EmptyMini>
          ) : (
            (stats?.activity ?? []).map((a) => {
              const def = ACTION_LABELS[a.action] ?? ACTION_LABELS.open;
              return (
                <ActivityRow
                  key={`${a.id}-${a.created_at}`}
                  icon={def.Icon}
                  tone={def.tone}
                  title={`${def.label}: ${a.titulo}`}
                  time={relTime(a.created_at)}
                />
              );
            })
          )}
        </Panel>

        <Panel
          title={recentsLabel}
          right={
            <button
              onClick={onOpenLibrary}
              className="text-[11px] font-semibold text-ai-200 hover:text-ai-100 transition"
            >
              Ver todos
            </button>
          }
        >
          {(stats?.recents ?? []).length === 0 ? (
            <EmptyMini>Nenhum registro ainda.</EmptyMini>
          ) : (
            (stats?.recents ?? []).map((r, i) => (
              <ProjectRow
                key={r.id}
                icon={[Wand2, Bot, Layers, Zap][i % 4]}
                tone={(["violet", "blue", "emerald", "amber"] as const)[i % 4]}
                title={r.titulo}
                time={`${r.categoria ? r.categoria + " · " : ""}${relTime(r.created_at)}`}
                onClick={onOpenLibrary}
              />
            ))
          )}
        </Panel>
      </section>

      <Dock onCenter={onCreate} onLibrary={onOpenLibrary} />
    </div>
  );
}

/* ===================== Pieces ===================== */

function Aurora() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute -top-32 -left-20 h-[420px] w-[420px] rounded-full bg-ai-500/30 blur-[120px]" />
      <div className="absolute top-10 right-0 h-[360px] w-[360px] rounded-full bg-ai-400/20 blur-[120px]" />
      <div className="absolute bottom-0 left-1/3 h-[380px] w-[380px] rounded-full bg-fuchsia-600/15 blur-[140px]" />
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 25% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px), radial-gradient(circle at 50% 50%, white 1px, transparent 1px)",
          backgroundSize: "180px 180px, 220px 220px, 300px 300px",
        }}
      />
    </div>
  );
}

function HeroButton({
  icon: Icon,
  children,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-medium text-white/85 backdrop-blur-xl transition hover:border-ai-300/40 hover:bg-white/[0.07] hover:shadow-[0_0_24px_-8px_var(--ai-500)]"
    >
      <Icon className="h-4 w-4 text-ai-200 group-hover:text-ai-100" />
      {children}
    </button>
  );
}

function Orb() {
  return (
    <div className="relative hidden md:block h-44 w-44 lg:h-56 lg:w-56">
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-ai-500 via-fuchsia-600 to-ai-600 blur-2xl opacity-60" />
      <div className="absolute inset-2 rounded-full bg-gradient-to-br from-ai-400 via-ai-500 to-fuchsia-700 shadow-[inset_-20px_-30px_60px_rgba(0,0,0,0.6),inset_20px_20px_60px_rgba(255,255,255,0.15)]" />
      <div className="absolute inset-0 rounded-full border border-white/15" />
      <div className="absolute left-1/2 top-1/2 h-[140%] w-[10%] -translate-x-1/2 -translate-y-1/2 rotate-[70deg] rounded-full border border-ai-300/40 bg-gradient-to-b from-transparent via-ai-300/20 to-transparent" />
      <div className="absolute -top-2 right-6 h-1 w-1 rounded-full bg-white shadow-[0_0_8px_white]" />
      <div className="absolute bottom-4 -left-2 h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_10px_white]" />
      <div className="absolute top-1/3 -right-4 h-1 w-1 rounded-full bg-ai-200 shadow-[0_0_6px_var(--ai-300)]" />
    </div>
  );
}

function KpiCard({
  label,
  value,
  delta,
  deltaTone,
  deltaSuffix,
  icon: Icon,
  iconTone,
  spark,
  sparkColor,
}: {
  label: string;
  value: string;
  delta: string;
  deltaTone: "up" | "down";
  deltaSuffix?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconTone: "violet" | "blue" | "magenta" | "amber";
  spark: string;
  sparkColor: string;
}) {
  const toneBg: Record<typeof iconTone, string> = {
    violet: "from-violet-500 to-fuchsia-600",
    blue: "from-sky-500 to-blue-600",
    magenta: "from-fuchsia-500 to-pink-600",
    amber: "from-amber-400 to-orange-500",
  };
  const gid = React.useId();
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-4 backdrop-blur-xl">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-white/45">{label}</div>
          <div className="mt-1 text-2xl font-bold text-white">{value}</div>
        </div>
        <div
          className={cn(
            "grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br shadow-[0_0_24px_-6px] shadow-current",
            toneBg[iconTone],
          )}
        >
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold">
        <span className={deltaTone === "up" ? "text-emerald-300" : "text-rose-300"}>
          {deltaTone === "up" ? "↗" : "↘"} {delta}
        </span>
        {deltaSuffix && <span className="text-white/40">{deltaSuffix}</span>}
      </div>
      <svg viewBox="0 0 100 32" className="mt-2 h-10 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`g-${gid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={sparkColor} stopOpacity="0.5" />
            <stop offset="100%" stopColor={sparkColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${spark} L100 32 L0 32 Z`} fill={`url(#g-${gid})`} />
        <path
          d={spark}
          fill="none"
          stroke={sparkColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function Panel({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/90">{title}</h3>
        {right}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function EmptyMini({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-[12px] text-white/40">
      {children}
    </div>
  );
}

function ActivityRow({
  icon: Icon,
  tone,
  title,
  time,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "emerald" | "blue" | "amber" | "violet";
  title: string;
  time: string;
}) {
  const toneMap = {
    emerald: "from-emerald-500/40 to-emerald-600/20 text-emerald-200",
    blue: "from-sky-500/40 to-blue-600/20 text-sky-200",
    amber: "from-amber-500/40 to-orange-600/20 text-amber-200",
    violet: "from-violet-500/40 to-fuchsia-600/20 text-violet-200",
  };
  return (
    <div className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/[0.03] transition">
      <div
        className={cn(
          "grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br",
          toneMap[tone],
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] text-white/90 truncate">{title}</div>
        <div className="text-[11px] text-white/45">{time}</div>
      </div>
    </div>
  );
}

function ProjectRow({
  icon: Icon,
  tone,
  title,
  time,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "violet" | "blue" | "emerald" | "amber";
  title: string;
  time: string;
  onClick?: () => void;
}) {
  const toneMap = {
    violet: "from-violet-500 to-fuchsia-600",
    blue: "from-sky-500 to-blue-600",
    emerald: "from-emerald-500 to-teal-600",
    amber: "from-amber-400 to-orange-500",
  };
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/[0.03] transition"
    >
      <div
        className={cn(
          "grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br shadow-lg",
          toneMap[tone],
        )}
      >
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-white truncate">{title}</div>
        <div className="text-[11px] text-white/45 truncate">{time}</div>
      </div>
      <span className="grid h-7 w-7 place-items-center rounded-md text-white/40">
        <MoreHorizontal className="h-4 w-4" />
      </span>
    </button>
  );
}

function Dock({ onCenter, onLibrary }: { onCenter?: () => void; onLibrary?: () => void }) {
  return (
    <div className="pointer-events-none absolute bottom-4 inset-x-0 z-20 flex justify-center px-4">
      <div className="pointer-events-auto relative flex items-center gap-1 rounded-2xl border border-white/10 bg-black/60 px-3 py-2 backdrop-blur-2xl shadow-[0_20px_60px_-20px_var(--ai-500)]">
        <span
          aria-hidden
          className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r from-ai-500/30 via-fuchsia-500/30 to-ai-400/30 blur-xl opacity-70"
        />
        <DockBtn icon={Home} label="Início" active />
        <DockBtn icon={FolderOpen} label="Biblioteca" onClick={onLibrary} />
        <button
          onClick={onCenter}
          className="mx-2 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-ai-400 to-fuchsia-600 text-white shadow-[0_0_28px_-4px_var(--ai-500)] hover:scale-105 transition"
          aria-label="Criar novo"
        >
          <Plus className="h-5 w-5" />
        </button>
        <DockBtn icon={MessageCircle} label="Mensagens" />
        <DockBtn icon={User} label="Perfil" />
      </div>
    </div>
  );
}

function DockBtn({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition",
        active ? "text-ai-100" : "text-white/55 hover:text-white",
      )}
    >
      <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_var(--ai-400)]")} />
      <span>{label}</span>
    </button>
  );
}
