import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  Copy,
  Download,
  RefreshCw,
  LifeBuoy,
  Package,
  ShoppingBag,
  History,
  Bell,
  Loader2,
  Mail,
  Calendar,
  Monitor,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/minha-conta")({
  head: () => ({
    meta: [
      { title: "Minha Conta — MR sem Limites" },
      { name: "description", content: "Suas licenças, produtos, downloads e histórico." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MinhaContaPage,
});

type Tab = "licencas" | "produtos" | "downloads" | "pedidos" | "historico" | "notificacoes";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "licencas", label: "Licenças", icon: KeyRound },
  { key: "produtos", label: "Produtos", icon: Package },
  { key: "downloads", label: "Downloads", icon: Download },
  { key: "pedidos", label: "Pedidos", icon: ShoppingBag },
  { key: "historico", label: "Histórico", icon: History },
  { key: "notificacoes", label: "Notificações", icon: Bell },
];

function MinhaContaPage() {
  const [tab, setTab] = useState<Tab>("licencas");
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { id: data.user.id, email: data.user.email ?? null } : null);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="glass mx-auto max-w-md rounded-2xl p-8 text-center">
        <h1 className="text-xl font-semibold">Entre para ver sua conta</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Faça login com o email usado na compra.
        </p>
        <Button asChild className="mt-4 gradient-primary">
          <Link to="/login">Entrar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Portal do cliente
        </div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          <span className="gradient-text">Minha Conta</span>
        </h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </header>

      <nav className="glass flex flex-wrap gap-1 rounded-2xl p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-white/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </nav>

      {tab === "licencas" && <LicencasTab email={user.email ?? ""} />}
      {tab === "produtos" && <ProdutosTab email={user.email ?? ""} />}
      {tab === "downloads" && <DownloadsTab email={user.email ?? ""} />}
      {tab === "pedidos" && <PedidosTab email={user.email ?? ""} />}
      {tab === "historico" && <HistoricoTab email={user.email ?? ""} />}
      {tab === "notificacoes" && <NotificacoesTab userId={user.id} />}
    </div>
  );
}

// ============================================================
// Licenças
// ============================================================

type Licenca = {
  id: string;
  chave: string;
  status: string;
  tipo: string;
  plano: string | null;
  produto_id: string | null;
  expira_em: string | null;
  ativada_em: string | null;
  device_id: string | null;
  ultimo_acesso: string | null;
};

function LicencasTab({ email }: { email: string }) {
  const [rows, setRows] = useState<Licenca[] | null>(null);
  const [produtos, setProdutos] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!email) return;
    (async () => {
      const { data } = await supabase
        .from("licencas")
        .select("id,chave,status,tipo,plano,produto_id,expira_em,ativada_em,device_id,ultimo_acesso")
        .eq("email", email.toLowerCase())
        .order("created_at", { ascending: false });
      const list = (data ?? []) as Licenca[];
      setRows(list);
      const ids = Array.from(new Set(list.map((l) => l.produto_id).filter(Boolean))) as string[];
      if (ids.length > 0) {
        const { data: p } = await supabase.from("produtos").select("id,nome").in("id", ids);
        const map: Record<string, string> = {};
        (p ?? []).forEach((x: any) => (map[x.id] = x.nome));
        setProdutos(map);
      }
    })();
  }, [email]);

  if (!rows) return <SkeletonCard />;
  if (rows.length === 0) return <EmptyState msg="Você ainda não tem licenças." />;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map((l) => (
        <LicencaCard key={l.id} l={l} produto={l.produto_id ? produtos[l.produto_id] : null} />
      ))}
    </div>
  );
}

function LicencaCard({ l, produto }: { l: Licenca; produto: string | null }) {
  const dias =
    l.expira_em == null
      ? null
      : Math.max(
          0,
          Math.ceil((new Date(l.expira_em).getTime() - Date.now()) / 86_400_000),
        );
  const encerrada = l.status !== "ativa";

  const baixarTxt = () => {
    const conteudo = [
      `MR sem Limites — Licença`,
      ``,
      `Chave: ${l.chave}`,
      `Produto: ${produto ?? l.plano ?? "—"}`,
      `Tipo: ${l.tipo}`,
      `Status: ${l.status}`,
      `Validade: ${l.expira_em ? new Date(l.expira_em).toLocaleDateString("pt-BR") : "Vitalícia"}`,
    ].join("\n");
    const blob = new Blob([conteudo], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `licenca-${l.chave}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {produto ?? l.plano ?? "Licença"}
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider",
            l.status === "ativa"
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-rose-500/15 text-rose-300",
          )}
        >
          {l.status}
        </span>
      </div>
      <div className="mb-3 flex items-center gap-2 font-mono text-lg tracking-[0.15em]">
        <span>{l.chave}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(l.chave);
            toast.success("Chave copiada");
          }}
          className="text-muted-foreground hover:text-foreground"
          title="Copiar"
        >
          <Copy className="size-4" />
        </button>
      </div>
      <ul className="mb-3 space-y-1 text-xs text-muted-foreground">
        <li className="flex items-center gap-2">
          <Calendar className="size-3.5" />
          {l.expira_em ? (
            <>
              Válida até {new Date(l.expira_em).toLocaleDateString("pt-BR")}
              {dias !== null && (
                <span className="ml-1 text-foreground">· {dias} dia(s) restantes</span>
              )}
            </>
          ) : (
            "Vitalícia"
          )}
        </li>
        <li className="flex items-center gap-2">
          <Monitor className="size-3.5" />
          Dispositivo: {l.device_id ? l.device_id.slice(0, 12) + "…" : "nenhum ativado"}
        </li>
        {l.ultimo_acesso && (
          <li className="flex items-center gap-2">
            <History className="size-3.5" />
            Último acesso: {new Date(l.ultimo_acesso).toLocaleString("pt-BR")}
          </li>
        )}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={baixarTxt}>
          <Download className="mr-1 size-4" /> Baixar
        </Button>
        <Button size="sm" variant="secondary" asChild>
          <Link to="/baixar-extensao">
            <Package className="mr-1 size-4" /> Extensão
          </Link>
        </Button>
        {encerrada && (
          <Button size="sm" className="gradient-primary" asChild>
            <Link to="/">
              <RefreshCw className="mr-1 size-4" /> Renovar
            </Link>
          </Button>
        )}
        <Button size="sm" variant="ghost" asChild>
          <a href="https://mrsemlimites.lovable.app/suporte" target="_blank" rel="noreferrer">
            <LifeBuoy className="mr-1 size-4" /> Suporte
          </a>
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Produtos
// ============================================================

function ProdutosTab({ email }: { email: string }) {
  const [rows, setRows] = useState<any[] | null>(null);

  useEffect(() => {
    (async () => {
      // deriva produtos dos produto_id das licenças do usuário
      const { data: lics } = await supabase
        .from("licencas")
        .select("produto_id")
        .eq("email", email.toLowerCase());
      const ids = Array.from(
        new Set((lics ?? []).map((x: any) => x.produto_id).filter(Boolean)),
      ) as string[];
      if (ids.length === 0) {
        setRows([]);
        return;
      }
      const { data } = await supabase
        .from("produtos")
        .select("id,nome,descricao")
        .in("id", ids);
      setRows(data ?? []);
    })();
  }, [email]);

  if (!rows) return <SkeletonCard />;
  if (rows.length === 0) return <EmptyState msg="Nenhum produto vinculado ainda." />;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map((r: any) => (
        <div key={r.id} className="glass rounded-2xl p-4">
          <div className="mb-1 font-semibold">{r.nome ?? "Produto"}</div>
          <div className="text-xs text-muted-foreground">{r.descricao ?? ""}</div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Downloads
// ============================================================

function DownloadsTab({ email: _e }: { email: string }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="glass rounded-2xl p-4">
        <div className="mb-1 font-semibold">Extensão MR sem Limites</div>
        <div className="mb-3 text-xs text-muted-foreground">
          Última versão da extensão para navegador.
        </div>
        <Button asChild size="sm" className="gradient-primary">
          <Link to="/baixar-extensao">
            <Download className="mr-1 size-4" /> Baixar
          </Link>
        </Button>
      </div>
      <div className="glass rounded-2xl p-4">
        <div className="mb-1 font-semibold">Manuais & Aulas</div>
        <div className="mb-3 text-xs text-muted-foreground">
          Tutoriais, guias de instalação e atualizações.
        </div>
        <Button asChild size="sm" variant="secondary">
          <Link to="/aulas">Abrir</Link>
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Pedidos
// ============================================================

function PedidosTab({ email }: { email: string }) {
  const [rows, setRows] = useState<any[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("payment_transactions")
        .select("id,valor,status,metodo,aprovado_em,created_at,plano_id")
        .eq("cliente_email", email.toLowerCase())
        .order("created_at", { ascending: false })
        .limit(50);
      setRows(data ?? []);
    })();
  }, [email]);

  if (!rows) return <SkeletonCard />;
  if (rows.length === 0) return <EmptyState msg="Você ainda não tem pedidos." />;

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <table className="w-full text-sm">
        <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr className="border-b border-white/5">
            <th className="px-4 py-3">Data</th>
            <th className="px-4 py-3">Valor</th>
            <th className="px-4 py-3">Método</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-white/5 last:border-b-0">
              <td className="px-4 py-3 text-xs">
                {new Date(r.created_at).toLocaleString("pt-BR")}
              </td>
              <td className="px-4 py-3 font-medium">
                R$ {Number(r.valor ?? 0).toFixed(2).replace(".", ",")}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{r.metodo ?? "—"}</td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider",
                    r.status === "aprovado"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : r.status === "pendente"
                        ? "bg-amber-500/15 text-amber-300"
                        : "bg-rose-500/15 text-rose-300",
                  )}
                >
                  {r.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// Histórico
// ============================================================

function HistoricoTab({ email }: { email: string }) {
  const [rows, setRows] = useState<any[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data: cli } = await supabase
        .from("clientes")
        .select("id")
        .eq("email", email.toLowerCase())
        .maybeSingle();
      const cliId = cli?.id;

      const { data: licIds } = await supabase
        .from("licencas")
        .select("id")
        .eq("email", email.toLowerCase());
      const ids = (licIds ?? []).map((x: any) => x.id);
      if (ids.length === 0) {
        setRows([]);
        return;
      }
      const { data } = await supabase
        .from("licencas_eventos")
        .select("id,tipo,mensagem,created_at")
        .in("licenca_id", ids)
        .order("created_at", { ascending: false })
        .limit(100);
      void cliId;
      setRows(data ?? []);
    })();
  }, [email]);

  if (!rows) return <SkeletonCard />;
  if (rows.length === 0) return <EmptyState msg="Sem eventos ainda." />;

  return (
    <div className="glass rounded-2xl p-4">
      <ul className="space-y-2 text-sm">
        {rows.map((e) => (
          <li key={e.id} className="flex items-start justify-between gap-3 border-b border-white/5 pb-2 last:border-b-0">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {e.tipo}
              </div>
              <div>{e.mensagem}</div>
            </div>
            <div className="whitespace-nowrap text-xs text-muted-foreground">
              {new Date(e.created_at).toLocaleString("pt-BR")}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// Notificações
// ============================================================

function NotificacoesTab({ userId }: { userId: string }) {
  const [rows, setRows] = useState<any[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("notificacoes")
        .select("id,titulo,mensagem,categoria,tipo,link,created_at,lida")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);
      setRows(data ?? []);
    })();
  }, [userId]);

  if (!rows) return <SkeletonCard />;
  if (rows.length === 0) return <EmptyState msg="Sem notificações." />;

  return (
    <div className="glass rounded-2xl p-4">
      <ul className="space-y-2 text-sm">
        {rows.map((n) => (
          <li
            key={n.id}
            className="flex items-start gap-3 border-b border-white/5 pb-2 last:border-b-0"
          >
            <Mail className="mt-0.5 size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">{n.titulo}</div>
              <div className="text-xs text-muted-foreground">{n.mensagem}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                {new Date(n.created_at).toLocaleString("pt-BR")}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// helpers de UI
// ============================================================

function SkeletonCard() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">{msg}</div>
  );
}
