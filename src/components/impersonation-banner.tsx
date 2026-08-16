import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, ArrowLeft, Lock, Users, KeyRound, Tag } from "lucide-react";
import { toast } from "sonner";

import { useImpersonation } from "@/hooks/useImpersonation";
import { clearImpersonation, type ImpersonationState } from "@/lib/impersonation";
import { supabase } from "@/integrations/supabase/client";

/**
 * Barra fixa (full-width) do MODO ADMINISTRADOR — visualizando painel
 * de um Revendedor ou Cliente em somente leitura.
 *
 * • Não altera sessão nem role.
 * • Um `ReadOnlyGuard` global (montado aqui) intercepta ações de escrita.
 * • Botão "Voltar para Administração" retorna à URL exata de origem.
 */
export function ImpersonationBanner() {
  const state = useImpersonation();

  if (!state) return null;

  return (
    <>
      <FixedBar state={state} />
      {/* Reserva de espaço para não sobrepor conteúdo */}
      <div aria-hidden className="w-full" style={{ height: "var(--impersonation-h, 96px)" }} />
      <ReadOnlyGuard />
    </>
  );
}

function FixedBar({ state }: { state: ImpersonationState }) {
  const navigate = useNavigate();
  const kindLabel = state.kind === "revendedor" ? "Painel do Revendedor" : "Painel do Cliente";
  // Glow por tipo (não altera design system)
  const glow =
    state.kind === "revendedor"
      ? "var(--brand-blue)"
      : /* cliente */ "var(--brand-emerald)";

  const stats = useTargetStats(state);

  // Ajusta a altura reservada via CSS var conforme viewport
  useEffect(() => {
    const el = document.documentElement;
    const apply = () => {
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      el.style.setProperty("--impersonation-h", isDesktop ? "84px" : "128px");
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      data-impersonation-safe="1"
      className="fixed inset-x-0 top-0 z-[70] w-full border-b backdrop-blur-xl"
      style={{
        borderColor: `color-mix(in oklab, ${glow} 45%, transparent)`,
        background:
          `linear-gradient(90deg, color-mix(in oklab, ${glow} 30%, oklch(0.15 0.03 260) 70%), color-mix(in oklab, var(--brand-magenta) 22%, oklch(0.15 0.03 260) 70%))`,
        boxShadow: `0 6px 32px -10px color-mix(in oklab, ${glow} 70%, transparent)`,
      }}
    >
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 md:px-6">
        {/* Bloco esquerdo — identidade + campos */}
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-full"
            style={{
              background: `color-mix(in oklab, ${glow} 40%, oklch(0 0 0 / 40%))`,
              boxShadow: `0 0 18px color-mix(in oklab, ${glow} 60%, transparent)`,
            }}
          >
            <Eye className="size-4 text-white" />
          </span>

          <div className="min-w-0 flex-1">
            {/* Linha 1: cabeçalho */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] uppercase tracking-[0.18em] text-white/90">
              <span className="inline-flex items-center gap-1 font-semibold">
                👁️ Modo Administrador
              </span>
              <span className="opacity-60">·</span>
              <span className="font-medium">Visualizando: {kindLabel}</span>
              <span
                className="inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-semibold tracking-widest text-amber-200"
                title="Todas as ações de escrita estão desativadas"
              >
                <Lock className="size-3" /> Somente Leitura
              </span>
            </div>

            {/* Linha 2: nome + email */}
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs md:text-sm">
              <span className="truncate font-semibold text-white">
                {state.name || "—"}
              </span>
              {state.email ? (
                <span className="truncate text-white/80">{state.email}</span>
              ) : null}
              <StatusPill status={stats.status} />
            </div>

            {/* Linha 3: métricas */}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/90">
              {state.kind === "revendedor" ? (
                <>
                  <MetricChip icon={Tag} label="Promoções" value={stats.promocoes} />
                  <MetricChip icon={Users} label="Clientes" value={stats.clientes} />
                  <MetricChip icon={KeyRound} label="Licenças" value={stats.licencas} />
                </>
              ) : (
                <>
                  <MetricChip icon={KeyRound} label="Licenças" value={stats.licencas} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Botão voltar */}
        <button
          type="button"
          data-impersonation-safe="1"
          onClick={() => {
            const returnTo = state.returnTo || "/admin";
            clearImpersonation();
            toast.success("Retornando à Administração");
            navigate({ to: returnTo });
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-black/55 px-3 py-2 text-xs font-semibold text-white transition hover:bg-black/75 md:text-sm"
        >
          <ArrowLeft className="size-3.5" /> <span className="hidden sm:inline">Voltar para</span> Administração
        </button>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string | null }) {
  if (!status) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/90">
      {status}
    </span>
  );
}

function MetricChip({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | null;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-0.5">
      <Icon className="size-3" />
      <span className="opacity-80">{label}:</span>
      <span className="font-semibold">{value ?? "—"}</span>
    </span>
  );
}

type TargetStats = {
  status: string | null;
  promocoes: number | null;
  clientes: number | null;
  licencas: number | null;
};

function useTargetStats(state: ImpersonationState): TargetStats {
  const [stats, setStats] = useState<TargetStats>({
    status: null,
    promocoes: null,
    clientes: null,
    licencas: null,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      const table = state.kind === "revendedor" ? "revendedores" : "clientes";
      const [statusRes, promocoesRes, clientesRes, licencasRes] = await Promise.all([
        (supabase as any).from(table).select("status").eq("id", state.id).maybeSingle(),
        state.kind === "revendedor"
          ? (supabase as any)
              .from("promocoes")
              .select("id", { count: "exact", head: true })
              .eq("revendedor_id", state.id)
          : Promise.resolve({ count: null }),
        state.kind === "revendedor"
          ? (supabase as any)
              .from("clientes")
              .select("id", { count: "exact", head: true })
              .eq("revendedor_id", state.id)
          : Promise.resolve({ count: null }),
        (supabase as any)
          .from("licencas")
          .select("id", { count: "exact", head: true })
          .eq(state.kind === "revendedor" ? "revendedor_id" : "cliente_id", state.id),
      ]).catch(() => [
        { data: null },
        { count: null },
        { count: null },
        { count: null },
      ]);

      if (!alive) return;
      const rawStatus =
        (statusRes as { data?: { status?: string } | null } | null)?.data?.status ?? null;
      const statusLabel = rawStatus
        ? state.kind === "revendedor"
          ? `Revendedor ${rawStatus}`
          : `Cliente ${rawStatus}`
        : null;
      setStats({
        status: statusLabel,
        promocoes: (promocoesRes as { count: number | null } | null)?.count ?? null,
        clientes: (clientesRes as { count: number | null } | null)?.count ?? null,
        licencas: (licencasRes as { count: number | null } | null)?.count ?? null,
      });
    })();
    return () => {
      alive = false;
    };
  }, [state.id, state.kind]);

  return stats;
}

/* ============================================================
 * Read-Only Guard
 * ------------------------------------------------------------
 * Intercepta cliques em botões de escrita e submissões de form
 * enquanto o modo visualização estiver ativo. Não altera dados,
 * apenas bloqueia a interação no cliente. Sinaliza com toast.
 * ============================================================ */
const WRITE_TEXT = /^(salvar|criar|editar|excluir|apagar|deletar|remover|cancelar\s|aprovar|reprovar|renovar|revogar|resetar|gerar|enviar|confirmar|publicar|atualizar|novo|nova|adicionar|inserir|upload|importar|exportar|substituir|mover|duplicar|copiar\s+para|copy\s+to|desativar|ativar)\b/i;

function ReadOnlyGuard() {
  useEffect(() => {
    const isSafe = (el: Element | null) =>
      !!el?.closest('[data-impersonation-safe="1"], nav, [role="navigation"], a, [role="link"]');

    const clickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const el = target.closest<HTMLElement>(
        'button, [role="button"], input[type="submit"], input[type="reset"]',
      );
      if (!el) return;
      if (isSafe(el)) return;

      // Anchors renderizados como botões — permitir navegação
      if (el.tagName === "A") return;

      const explicitWrite = el.dataset?.write === "1" || el.getAttribute("data-write") === "1";
      const type = (el as HTMLInputElement).type?.toLowerCase();
      const isSubmit = type === "submit" || type === "reset";

      const label =
        (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim();

      // Cancel isolado ("Cancelar") em dialog não é ação destrutiva — permitir
      if (/^cancelar$/i.test(label)) return;

      const shouldBlock = explicitWrite || isSubmit || (label && WRITE_TEXT.test(label));
      if (!shouldBlock) return;

      e.preventDefault();
      e.stopPropagation();
      toast.error("Modo somente leitura — ação bloqueada.", {
        description: "Clique em 'Voltar para Administração' para editar.",
      });
    };

    const submitHandler = (e: SubmitEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (isSafe(target)) return;
      e.preventDefault();
      e.stopPropagation();
      toast.error("Modo somente leitura — envio bloqueado.");
    };

    document.addEventListener("click", clickHandler, true);
    document.addEventListener("submit", submitHandler, true);
    return () => {
      document.removeEventListener("click", clickHandler, true);
      document.removeEventListener("submit", submitHandler, true);
    };
  }, []);

  return null;
}
