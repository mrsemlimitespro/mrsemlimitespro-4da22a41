import { useEffect, useState } from "react";
import { Bell, Settings, Loader2, CheckCheck, LogOut } from "lucide-react";
import { GlobalSearch } from "@/components/global-search";
import { Link } from "@tanstack/react-router";

import { BrandMark } from "@/components/brand";
import { AdminPasswordDialog } from "@/components/admin-password-gate";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsAuthed } from "@/hooks/useIsAuthed";
import { useImpersonation } from "@/hooks/useImpersonation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Notif = {
  id: string;
  titulo: string;
  mensagem: string | null;
  tipo: string | null;
  categoria: string | null;
  link: string | null;
  lida_em: string | null;
  created_at: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

import { isAdminEmail } from "@/hooks/useIsAdmin";

export function TopBar() {
  const [adminOpen, setAdminOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [isRevendedor, setIsRevendedor] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function check(session: any) {
      if (!mounted) return;
      setSignedIn(!!session);
      if (!session?.user) {
        setIsAdminUser(false);
        setUserEmail(null);
        setFirstName(null);
        setIsRevendedor(false);
        return;
      }
      setUserEmail(session.user.email ?? null);
      if (mounted) setIsAdminUser(isAdminEmail(session.user.email));
      // Busca nome do revendedor para saudação personalizada.
      try {
        const { data: rev } = await (supabase as any)
          .from("revendedores")
          .select("nome")
          .eq("auth_user_id", session.user.id)
          .maybeSingle();
        if (!mounted) return;
        const nome = (rev?.nome ?? session.user.user_metadata?.nome ?? "").trim();
        if (nome) {
          setFirstName(nome.split(/\s+/)[0]);
          setIsRevendedor(!!rev?.nome);
        } else {
          setFirstName(null);
          setIsRevendedor(false);
        }
      } catch {
        setFirstName(null);
      }
    }
    supabase.auth.getSession().then(({ data }) => check(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => check(s));
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function reload() {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("notificacoes")
      .select("id, titulo, mensagem, tipo, categoria, link, lida_em, created_at")
      .order("created_at", { ascending: false })
      .limit(15);
    setNotifs((data ?? []) as Notif[]);
    setLoading(false);
  }

  useEffect(() => {
    if (!signedIn) {
      setNotifs([]);
      return;
    }
    reload();
    const ch = supabase
      .channel("notif-topbar")
      .on("postgres_changes", { event: "*", schema: "public", table: "notificacoes" }, () =>
        reload(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [signedIn]);

  const unread = notifs.filter((n) => !n.lida_em).length;

  async function markAllRead() {
    const ids = notifs.filter((n) => !n.lida_em).map((n) => n.id);
    if (ids.length === 0) return;
    await (supabase as any)
      .from("notificacoes")
      .update({ lida_em: new Date().toISOString() })
      .in("id", ids);
    reload();
  }

  async function markOne(id: string) {
    await (supabase as any)
      .from("notificacoes")
      .update({ lida_em: new Date().toISOString() })
      .eq("id", id);
    reload();
  }

  const impersonation = useImpersonation();
  const authed = useIsAuthed();
  const role = useUserRole();

  return (
    <header
      className="sticky z-30 mx-auto flex w-full max-w-[1400px] items-center gap-2 px-3 md:gap-3 md:px-6"
      style={{
        top: impersonation
          ? "calc(var(--impersonation-h, 96px) + 0.5rem)"
          : undefined,
        // Fallback padrão: sticky top-2 (0.5rem) desktop e top-2 mobile
        ...(impersonation ? {} : { top: "0.5rem" }),
      }}
    >
      {/* Spacer for the floating rail on md+ */}
      <div className="hidden md:block md:w-16 shrink-0" aria-hidden />

      <PanelChip authed={authed} role={role} isAdminUser={isAdminUser} />

      {signedIn && firstName && (
        <div
          className="hidden min-w-0 shrink-0 truncate text-sm font-medium text-foreground/90 md:block"
          title={isRevendedor ? `Revendedor ${firstName}` : firstName}
        >
          {isRevendedor ? (
            <>
              Olá,{" "}
              <span className="gradient-text-warm font-semibold">
                Revendedor {firstName}
              </span>
            </>
          ) : (
            <>
              Bem-vindo, <span className="font-semibold">{firstName}</span>
            </>
          )}
        </div>
      )}


      <GlobalSearch />


      <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Notificações"
              className="relative grid size-11 place-items-center rounded-full border border-border/70 bg-surface/60 text-foreground/80 backdrop-blur-xl transition-colors hover:text-foreground active:scale-95"
            >
              <Bell className="size-[18px]" strokeWidth={2} />
              {unread > 0 && (
                <span
                  aria-hidden
                  className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-semibold text-white"
                  style={{
                    background: "var(--brand-magenta)",
                    boxShadow: "0 0 8px color-mix(in oklab, var(--brand-magenta) 80%, transparent)",
                  }}
                >
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="glass-strong w-[360px] p-0" sideOffset={10}>
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <h4 className="text-sm font-semibold">Notificações</h4>
              {unread > 0 ? (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <CheckCheck className="size-3.5" strokeWidth={2} />
                  Marcar todas
                </button>
              ) : null}
            </div>
            <div className="max-h-[420px] overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center px-4 py-10 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" /> Carregando...
                </div>
              ) : notifs.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Nenhuma notificação.
                </p>
              ) : (
                <ul>
                  {notifs.map((n) => {
                    const body = (
                      <div
                        className={
                          "flex items-start gap-3 border-b border-border/40 px-4 py-3 text-left transition-colors last:border-0 hover:bg-white/[0.03]"
                        }
                      >
                        <span
                          aria-hidden
                          className="mt-1.5 size-1.5 shrink-0 rounded-full"
                          style={{
                            background: n.lida_em ? "transparent" : "var(--brand-magenta)",
                            boxShadow: n.lida_em
                              ? undefined
                              : "0 0 8px color-mix(in oklab, var(--brand-magenta) 80%, transparent)",
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{n.titulo}</p>
                          {n.mensagem ? (
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {n.mensagem}
                            </p>
                          ) : null}
                          <p className="mt-1 text-[11px] text-muted-foreground/80">
                            {timeAgo(n.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                    return (
                      <li key={n.id}>
                        {n.link ? (
                          <Link to={n.link} onClick={() => markOne(n.id)} className="block">
                            {body}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => markOne(n.id)}
                            className="block w-full"
                          >
                            {body}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {isAdminUser && (
          <IconBadge dot aria-label="Painel administrativo" onClick={() => setAdminOpen(true)}>
            <Settings className="size-[18px]" strokeWidth={2} />
          </IconBadge>
        )}
        {signedIn === false ? (
          <Link
            to="/login"
            className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-primary-foreground gradient-primary active:scale-95 transition-transform"
          >
            Entrar
          </Link>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Perfil"
                className="grid size-11 place-items-center overflow-hidden rounded-full border border-border/70 bg-surface/60 backdrop-blur-xl active:scale-95 transition-transform"
              >
                <BrandMark size={36} glow={false} className="rounded-full" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="glass-strong w-64 p-3" sideOffset={10}>
              <div className="mb-3 px-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Conectado como
                </p>
                <p className="mt-0.5 truncate text-sm font-medium" title={userEmail ?? ""}>
                  {userEmail ?? "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/";
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="size-4" strokeWidth={2} />
                Sair
              </button>
            </PopoverContent>
          </Popover>
        )}
      </div>

      <AdminPasswordDialog open={adminOpen} onOpenChange={setAdminOpen} />
    </header>
  );
}

function IconBadge({
  children,
  dot = false,
  onClick,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  dot?: boolean;
  onClick?: () => void;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="relative grid size-11 place-items-center rounded-full border border-border/70 bg-surface/60 text-foreground/80 backdrop-blur-xl transition-colors hover:text-foreground active:scale-95"
    >
      {children}
      {dot && (
        <span
          aria-hidden
          className="absolute right-2.5 top-2.5 size-2 rounded-full"
          style={{
            background: "var(--brand-magenta)",
            boxShadow: "0 0 8px color-mix(in oklab, var(--brand-magenta) 80%, transparent)",
          }}
        />
      )}
    </button>
  );
}

/**
 * PanelChip — indicador permanente no Header do painel atual do usuário.
 */
function PanelChip({
  authed,
  role,
  isAdminUser,
}: {
  authed: boolean | null;
  role: ReturnType<typeof useUserRole>;
  isAdminUser: boolean;
}) {
  const cfg = (() => {
    if (isAdminUser || role === "admin")
      return { emoji: "⭐", label: "Painel Administrador", glow: "var(--brand-orange)" };
    if (role === "revendedor")
      return { emoji: "🏪", label: "Painel Revendedor", glow: "var(--brand-blue)" };
    if (authed === true && role === "cliente")
      return { emoji: "👤", label: "Painel Cliente", glow: "var(--brand-emerald)" };
    if (authed === false) return { emoji: "🌐", label: "Visitante", glow: "oklch(0.75 0.02 260)" };
    return null; // loading
  })();

  if (!cfg) return null;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            aria-label={cfg.label}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-surface/60 px-2.5 text-xs font-semibold backdrop-blur-xl md:h-11 md:px-3 md:text-sm"
            style={{
              boxShadow: `0 0 0 1px color-mix(in oklab, ${cfg.glow} 40%, transparent), 0 0 18px -4px color-mix(in oklab, ${cfg.glow} 55%, transparent)`,
            }}
          >
            <span aria-hidden className="text-base leading-none md:text-lg">
              {cfg.emoji}
            </span>
            <span className="hidden sm:inline">{cfg.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">{cfg.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
