import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { claimInitialAdmin, createInitialAdmin } from "@/lib/admin/admin.functions";
import {
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Loader2,
  Settings2,
  Palette,
  ShieldAlert,
  DatabaseBackup,
  UserCircle,
  Store,
  CreditCard,
  Coins,
  Sparkles,
  Volume2,
  KeySquare,
  Blocks,
  Home as HomeIcon,
  Server,
} from "lucide-react";
import { useModules } from "@/lib/admin/use-modules";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { resources } from "@/lib/admin/resources";
import { BRAND_NAME, BrandMark } from "@/components/brand";
import {
  AdminPasswordDialog,
  adminGatePassed,
  clearAdminGate,
} from "@/components/admin-password-gate";
import { PageBackButton } from "@/components/page-back-button";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel Administrativo — " + "MR sem limites" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const [checking, setChecking] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const pass = adminGatePassed();
    setUnlocked(pass);
    setDialogOpen(!pass);
    setChecking(false);
  }, []);

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!unlocked) {
    return (
      <>
        <div className="grid min-h-screen place-items-center bg-background px-4">
          <div className="glass w-full max-w-md rounded-2xl p-8 text-center">
            <ShieldCheck className="mx-auto mb-3 size-8 text-muted-foreground" />
            <h1 className="text-xl font-semibold">Acesso restrito</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Informe a senha de administrador para desbloquear o painel.
            </p>
            <Button className="mt-5 w-full gradient-primary" onClick={() => setDialogOpen(true)}>
              Informar senha
            </Button>
          </div>
        </div>
        <AdminPasswordDialog
          open={dialogOpen}
          onOpenChange={(o) => {
            setDialogOpen(o);
            if (!o) setUnlocked(adminGatePassed());
          }}
        />
      </>
    );
  }

  return <AdminShell />;
}

type SpecialLink = {
  key: string;
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  group?: string;
};

// Ordem canônica dos grupos no sidebar — Fase 2B: 5 grupos enterprise
const GROUP_ORDER = [
  "Dashboard",
  "Usuários",
  "Comercial",
  "Conteúdo",
  "Sistema",
] as const;

const specialLinks: SpecialLink[] = [
  // 🏠 Dashboard
  { key: "dashboard", to: "/admin", label: "Central de Controle", icon: LayoutDashboard, exact: true, group: "Dashboard" },
  { key: "home", to: "/admin/home", label: "Home (vitrine)", icon: HomeIcon, group: "Dashboard" },

  // 👥 Usuários
  { key: "visualizacao", to: "/admin/visualizacao", label: "Visualização de painéis", icon: ShieldCheck, group: "Usuários" },
  { key: "usuarios", to: "/admin/usuarios", label: "Administradores", icon: UserCircle, group: "Usuários" },

  // 💳 Comercial
  { key: "licencas-manager", to: "/admin/licencas", label: "Licenças", icon: KeySquare, group: "Comercial" },
  { key: "pack-autorizacoes", to: "/admin/pack-autorizacoes", label: "Autorizações de Packs", icon: KeySquare, group: "Comercial" },
  { key: "loja", to: "/admin/loja", label: "Loja (vitrine)", icon: Store, group: "Comercial" },
  { key: "pagamentos", to: "/admin/pagamentos", label: "Pagamentos", icon: CreditCard, group: "Comercial" },
  { key: "ajustar-creditos", to: "/admin/ajustar-creditos", label: "Ajustar Créditos", icon: Coins, group: "Comercial" },

  // ⚙ Sistema
  { key: "api-dashboard", to: "/admin/api-dashboard", label: "API de Controle", icon: Server, group: "Sistema" },
  { key: "modulos", to: "/admin/modulos", label: "Módulos", icon: Blocks, group: "Sistema" },
  { key: "configuracoes", to: "/admin/configuracoes", label: "Configurações Gerais", icon: Settings2, group: "Sistema" },
  { key: "personalizacao", to: "/admin/personalizacao", label: "Aparência", icon: Palette, group: "Sistema" },
  { key: "animacoes", to: "/admin/animacoes", label: "Animações", icon: Sparkles, group: "Sistema" },
  { key: "sons", to: "/admin/sons", label: "Sons", icon: Volume2, group: "Sistema" },
  { key: "seguranca", to: "/admin/seguranca", label: "Segurança", icon: ShieldAlert, group: "Sistema" },
  { key: "backup", to: "/admin/backup", label: "Backup", icon: DatabaseBackup, group: "Sistema" },

  // Rota antiga — mantida acessível via /admin/licencas-dashboard mas fora do menu
  { key: "licencas-dashboard", to: "/admin/licencas-dashboard", label: "Licenças — Dashboard (legado)", icon: ShieldCheck, group: "__hidden" },
];

function AdminShell() {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<
    { kind: "loading" } | { kind: "anon" } | { kind: "signed"; email: string; isAdmin: boolean }
  >({ kind: "loading" });
  const [signOpen, setSignOpen] = useState(false);
  const claim = useServerFn(claimInitialAdmin);

  async function refreshAuth() {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return setAuthState({ kind: "anon" });
    const { data: role } = await (supabase as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    setAuthState({ kind: "signed", email: user.email ?? "", isAdmin: !!role });
  }

  useEffect(() => {
    refreshAuth();
    const { data: sub } = supabase.auth.onAuthStateChange(() => refreshAuth());
    return () => sub.subscription.unsubscribe();
  }, []);

  const { visibleIn } = useModules();

  const visibleSpecialLinks = specialLinks.filter(
    (l) => l.group !== "__hidden" && visibleIn("sidebar", l.key),
  );
  const visibleResources = resources.filter(
    (r) => !r.hiddenFromSidebar && visibleIn("sidebar", r.key),
  );

  type MenuEntry =
    | { kind: "special"; link: SpecialLink }
    | { kind: "resource"; res: (typeof resources)[number] };

  const grouped = new Map<string, MenuEntry[]>();
  for (const g of GROUP_ORDER) grouped.set(g, []);
  for (const l of visibleSpecialLinks) {
    const g = l.group ?? "Sistema";
    (grouped.get(g) ?? grouped.set(g, []).get(g)!).push({ kind: "special", link: l });
  }
  for (const r of visibleResources) {
    const g = r.group ?? "Sistema";
    (grouped.get(g) ?? grouped.set(g, []).get(g)!).push({ kind: "resource", res: r });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-white/5 bg-black/30 p-4 md:flex md:flex-col">
          <div className="mb-6 flex items-center gap-2 px-2">
            <BrandMark size={36} />
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Admin</div>
              <div className="text-sm font-semibold">{BRAND_NAME}</div>
            </div>
          </div>

          <nav className="flex-1 space-y-4 overflow-y-auto pr-1">
            {Array.from(grouped.entries())
              .filter(([, items]) => items.length > 0)
              .map(([group, items]) => (
                <div key={group}>
                  <div className="mb-1 px-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                    {group}
                  </div>
                  <div className="space-y-1">
                    {items.map((entry) =>
                      entry.kind === "special" ? (
                        <SideLink
                          key={"s:" + entry.link.key}
                          to={entry.link.to}
                          icon={<entry.link.icon className="size-4" />}
                          exact={entry.link.exact}
                        >
                          {entry.link.label}
                        </SideLink>
                      ) : (
                        <SideLink
                          key={"r:" + entry.res.key}
                          to="/admin/$resource"
                          params={{ resource: entry.res.key }}
                          icon={<entry.res.icon className="size-4" />}
                        >
                          {entry.res.label}
                        </SideLink>
                      ),
                    )}
                  </div>
                </div>
              ))}
          </nav>


          <div className="mt-6 space-y-2 rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <div className="truncate text-xs text-muted-foreground">Sessão</div>
            <div className="truncate text-sm font-medium">
              {authState.kind === "signed" ? authState.email : "Painel desbloqueado"}
            </div>
            {authState.kind === "signed" && (
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {authState.isAdmin ? "Admin" : "Sem permissão"}
              </div>
            )}
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-foreground/90 hover:text-foreground"
            >
              <Link to="/">
                <LayoutDashboard className="size-4" /> Painel do Cliente
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                clearAdminGate();
                navigate({ to: "/" });
              }}
            >
              <LogOut className="size-4" /> Bloquear
            </Button>
          </div>
        </aside>

        <main className="flex-1 p-6 md:p-10">
          <div className="mb-4">
            <PageBackButton />
          </div>
          {authState.kind !== "loading" && (authState.kind === "anon" || !authState.isAdmin) && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 px-5 py-3 text-sm text-yellow-100/90">
              <div>
                {authState.kind === "anon"
                  ? "Você está visualizando o painel. Para salvar alterações, faça login como administrador."
                  : "Sua conta não tem permissão de admin. Reivindique para editar."}
              </div>
              <div className="flex gap-2">
                {authState.kind === "anon" ? (
                  <Button size="sm" className="gradient-primary" onClick={() => setSignOpen(true)}>
                    Entrar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="gradient-primary"
                    onClick={async () => {
                      try {
                        await claim();
                        toast.success("Você agora é administrador");
                        refreshAuth();
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Falha");
                      }
                    }}
                  >
                    Reivindicar admin
                  </Button>
                )}
              </div>
            </div>
          )}
          <Outlet />
        </main>
      </div>
      {signOpen && (
        <SignInDialog
          onClose={() => {
            setSignOpen(false);
            refreshAuth();
          }}
        />
      )}
    </div>
  );
}

function SignInDialog({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup" | "initial">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const createAdmin = useServerFn(createInitialAdmin);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/admin" },
        });
        if (error) throw error;
      } else {
        // initial admin
        await createAdmin({ data: { email, password } });
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Administrador criado");
      }
      toast.success("OK");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha");
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "signin"
      ? "Entrar"
      : mode === "signup"
        ? "Criar conta"
        : "Criar administrador inicial";
  const cta = mode === "signin" ? "Entrar" : mode === "signup" ? "Criar conta" : "Criar admin";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="glass w-full max-w-md space-y-4 rounded-2xl p-6"
      >
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Conta</div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {mode === "initial" && (
            <p className="mt-1 text-xs text-muted-foreground">
              Só funciona quando ainda não existe nenhum admin. Informe e-mail e senha.
            </p>
          )}
        </div>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
        />
        <Button type="submit" className="w-full gradient-primary" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : cta}
        </Button>
        <div className="flex flex-col gap-1 text-center text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="hover:text-foreground"
          >
            {mode === "signin" ? "Não tem conta? Cadastrar" : "Já tem conta? Entrar"}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "initial" ? "signin" : "initial")}
            className="hover:text-foreground"
          >
            {mode === "initial" ? "Voltar" : "Criar administrador inicial"}
          </button>
        </div>
      </form>
    </div>
  );
}

function SideLink({
  to,
  params,
  icon,
  exact,
  children,
}: {
  to: string;
  params?: Record<string, string>;
  icon: React.ReactNode;
  exact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to as never}
      params={params as never}
      activeOptions={{ exact: !!exact }}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-white/5 hover:text-foreground",
      )}
      activeProps={{ className: "bg-white/10 text-foreground" }}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}
