import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, Loader2, ShoppingCart } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AuthShell, primaryBtn } from "./login";
import { cn } from "@/lib/utils";
import { playSfx } from "@/lib/sfx";
import { PageBackButton } from "@/components/page-back-button";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — MR sem limites" },
      { name: "description", content: "Finalize sua compra de créditos ou plano." },
    ],
  }),
  component: CheckoutPage,
});

type Plano = {
  id: string;
  nome: string;
  preco: number;
  creditos_incluidos: number;
  duracao_dias: number;
  descricao: string | null;
  imagem_url: string | null;
};

type Pack = {
  id: string;
  nome: string;
  quantidade: number;
  preco: number;
  descricao: string | null;
  imagem_url: string | null;
};

type Produto = {
  id: string;
  nome: string;
  titulo: string | null;
  preco: number;
  descricao: string | null;
  imagem_url: string | null;
  categoria: string | null;
  status: string | null;
  link: string | null;
};

type Promo = {
  id: string;
  titulo: string;
  desconto_percentual: number | null;
  plano_id: string | null;
  pack_id: string | null;
};

type Gateway = { slug: string; nome: string };

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function readSearch() {
  if (typeof window === "undefined") return { plano: null, pack: null, produto: null, promo: null };
  const url = new URL(window.location.href);
  return {
    plano: url.searchParams.get("plano"),
    pack: url.searchParams.get("pack"),
    produto: url.searchParams.get("produto"),
    promo: url.searchParams.get("promo"),
  };
}

function CheckoutPage() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [plano, setPlano] = useState<Plano | null>(null);
  const [pack, setPack] = useState<Pack | null>(null);
  const [produto, setProduto] = useState<Produto | null>(null);

  const [promo, setPromo] = useState<Promo | null>(null);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [gatewaySlug, setGatewaySlug] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    id: string;
    valor: number;
    aguardando_configuracao: boolean;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      const [{ data: user }, gwRes] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("payment_gateways")
          .select("slug,nome")
          .eq("enabled", true)
          .order("priority", { ascending: true }),
      ]);
      if (!alive) return;
      setAuthed(!!user.user);

      const gws = (gwRes.data ?? []) as Gateway[];
      setGateways(gws);
      if (gws.length > 0) setGatewaySlug(gws[0].slug);

      const s = readSearch();

      if (s.promo) {
        const { data } = await supabase
          .from("promocoes")
          .select("id,titulo,desconto_percentual,plano_id,pack_id")
          .eq("id", s.promo)
          .maybeSingle();
        if (alive && data) setPromo(data as Promo);
      }

      const planoId = s.plano ?? null;
      const packId = s.pack ?? null;
      const produtoId = s.produto ?? null;

      if (planoId) {
        const { data } = await supabase
          .from("planos")
          .select("id,nome,preco,creditos_incluidos,duracao_dias,descricao,imagem_url")
          .eq("id", planoId)
          .maybeSingle();
        if (alive && data) setPlano(data as Plano);
      } else if (packId) {
        const { data } = await supabase
          .from("creditos_packs")
          .select("id,nome,quantidade,preco,descricao,imagem_url")
          .eq("id", packId)
          .maybeSingle();
        if (alive && data) setPack(data as Pack);
      } else if (produtoId) {
        const { data } = await supabase
          .from("produtos")
          .select("id,nome,titulo,preco,descricao,imagem_url,categoria,status,link")
          .eq("id", produtoId)
          .maybeSingle();
        if (alive && data) setProduto(data as Produto);
      }

      if (alive) setLoading(false);
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  const descontoPct = useMemo(() => {
    if (!promo) return 0;
    if (plano && promo.plano_id === plano.id) return Number(promo.desconto_percentual ?? 0);
    if (pack && promo.pack_id === pack.id) return Number(promo.desconto_percentual ?? 0);
    return 0;
  }, [promo, plano, pack]);

  const item =
    plano ??
    pack ??
    (produto
      ? {
          id: produto.id,
          nome: produto.titulo || produto.nome,
          preco: produto.preco,
          descricao: produto.descricao,
          imagem_url: produto.imagem_url,
        }
      : null);

  const valorBase = item ? Number(item.preco) : 0;
  const valorFinal = valorBase * (1 - descontoPct / 100);
  const semGateway = gateways.length === 0;

  async function onConfirm() {
    setMsg(null);
    if (!item) return;
    if (!authed) {
      navigate({ to: "/registro" });
      return;
    }
    setCreating(true);

    // Garantir revendedor
    const { data: rid } = await supabase.rpc("create_revendedor_profile", {});
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setCreating(false);
      setMsg("Sessão expirada. Faça login.");
      return;
    }
    const { data: rev } = await supabase
      .from("revendedores")
      .select("id")
      .eq("auth_user_id", userData.user.id)
      .maybeSingle();
    const revendedor_id = rev?.id ?? rid;
    if (!revendedor_id) {
      setCreating(false);
      setMsg("Não foi possível criar o perfil de revendedor.");
      return;
    }

    const status = semGateway ? "aguardando_configuracao" : "pendente";
    const gwSlug = semGateway ? "aguardando" : (gatewaySlug ?? "aguardando");

    const { data: tx, error } = await supabase
      .from("payment_transactions")
      .insert({
        revendedor_id,
        plano_id: plano?.id ?? null,
        pack_id: pack?.id ?? null,
        gateway_slug: gwSlug,
        valor: valorFinal,
        moeda: "BRL",
        status,
        metodo: gwSlug,
        metadata: {
          ...(promo ? { promo_id: promo.id, desconto_pct: descontoPct } : {}),
          ...(produto
            ? {
                produto_id: produto.id,
                produto_nome: produto.titulo || produto.nome,
                produto_categoria: produto.categoria,
              }
            : {}),
        },
      })
      .select("id, valor")
      .single();

    setCreating(false);
    if (error || !tx) {
      setMsg(error?.message ?? "Erro ao iniciar pagamento.");
      return;
    }

    // Se estiver aguardando configuração, notifica os admins.
    if (semGateway) {
      await supabase.from("notificacoes").insert({
        titulo: "Novo pedido aguardando pagamento",
        mensagem: `Pedido de ${brl(Number(tx.valor))} aguardando gateway ser configurado. Você pode liberar manualmente.`,
        tipo: "aviso",
        destino: "todos",
        categoria: "pagamento",
        link: "/admin/ajustar-creditos",
      });
    }

    playSfx("swipe");
    setPending({
      id: (tx as { id: string }).id,
      valor: Number(tx.valor),
      aguardando_configuracao: semGateway,
    });
  }

  if (loading) {
    return (
      <AuthShell>
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </AuthShell>
    );
  }

  if (!item) {
    return (
      <AuthShell>
        <div className="mb-3">
          <PageBackButton forceShow fallback="/creditos" label="Voltar para a loja" />
        </div>
        <h1 className="mb-3 text-lg font-semibold">Nenhum produto selecionado</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Volte à loja e escolha um pacote ou plano.
        </p>
        <button className={primaryBtn} onClick={() => navigate({ to: "/creditos" })}>
          Ver produtos
        </button>
      </AuthShell>
    );
  }

  if (pending) {
    return (
      <AuthShell>
        {pending.aguardando_configuracao ? (
          <div>
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-orange-500/40 bg-orange-500/10 p-3">
              <AlertTriangle className="size-5 text-orange-400" />
              <div>
                <p className="text-sm font-semibold">Aguardando configuração de pagamento</p>
                <p className="text-xs text-muted-foreground">
                  O admin ainda não configurou um gateway. Seu pedido foi registrado.
                </p>
              </div>
            </div>
            <p className="mb-2 text-sm">
              Valor: <strong>{brl(pending.valor)}</strong>
            </p>
            <p className="mb-3 text-xs text-muted-foreground">Código do pedido:</p>
            <div className="mb-4 rounded-xl border border-border/70 bg-surface/60 p-3 font-mono text-xs break-all">
              {pending.id}
            </div>
            <div className="rounded-xl border border-border/60 bg-surface/40 p-3 text-xs text-muted-foreground">
              <p className="flex items-center gap-2">
                <Bell className="size-3.5" />O admin foi avisado e pode liberar seus créditos
                manualmente. Assim que o gateway estiver configurado, o pagamento ficará disponível
                aqui.
              </p>
            </div>
            <button className={`${primaryBtn} mt-5`} onClick={() => navigate({ to: "/" })}>
              Ir para o painel
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
              <CheckCircle2 className="size-5 text-emerald-400" />
              <p className="text-sm font-semibold">Pagamento iniciado</p>
            </div>
            <p className="mb-2 text-sm">
              Valor: <strong>{brl(pending.valor)}</strong>
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              Referência (use na descrição do pagamento no gateway):
            </p>
            <div className="mb-4 rounded-xl border border-border/70 bg-surface/60 p-3 font-mono text-xs break-all">
              {pending.id}
            </div>
            <p className="text-sm">
              Assim que o gateway confirmar, seus créditos serão liberados automaticamente.
            </p>
            <button className={`${primaryBtn} mt-5`} onClick={() => navigate({ to: "/" })}>
              Ir para o painel
            </button>
          </div>
        )}
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="mb-3 flex items-center justify-between gap-2">
        <PageBackButton forceShow fallback="/creditos" label="Continuar comprando" />
        <button
          type="button"
          onClick={() => navigate({ to: "/creditos" })}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancelar compra
        </button>
      </div>
      <h1 className="mb-1 text-lg font-semibold">Finalizar compra</h1>
      <p className="mb-4 text-xs text-muted-foreground">Revise os detalhes e confirme.</p>

      {/* Resumo do item */}
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-border/70 bg-surface/60 p-3">
        {item.imagem_url && (
          <img
            src={item.imagem_url}
            alt={item.nome}
            className="size-14 shrink-0 rounded-lg object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{item.nome}</p>
          {plano && (
            <p className="text-[11px] text-muted-foreground">
              {plano.creditos_incluidos.toLocaleString("pt-BR")} créditos · {plano.duracao_dias}{" "}
              dias
            </p>
          )}
          {pack && (
            <p className="text-[11px] text-muted-foreground">
              {pack.quantidade} {pack.quantidade === 1 ? "chave" : "chaves"}
            </p>
          )}
          {item.descricao && (
            <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{item.descricao}</p>
          )}
        </div>
        <p className="text-sm font-semibold">{brl(valorBase)}</p>
      </div>

      {promo && descontoPct > 0 && (
        <div
          className="mb-4 flex items-center gap-3 rounded-xl border p-3 text-xs"
          style={{
            borderColor: "color-mix(in oklab, var(--brand-orange) 45%, transparent)",
            background:
              "linear-gradient(120deg, color-mix(in oklab, var(--brand-orange) 12%, transparent), color-mix(in oklab, var(--brand-magenta) 10%, transparent))",
          }}
        >
          <span className="text-lg">🔥</span>
          <div className="flex-1">
            <p className="font-semibold text-foreground">{promo.titulo}</p>
            <p className="text-muted-foreground">
              Desconto de <strong>{descontoPct}%</strong> aplicado.
            </p>
          </div>
        </div>
      )}

      {/* Gateways */}
      {semGateway ? (
        <div className="mb-4 rounded-xl border border-orange-500/40 bg-orange-500/10 p-3">
          <div className="mb-1 flex items-center gap-2">
            <AlertTriangle className="size-4 text-orange-400" />
            <p className="text-sm font-semibold">Aguardando configuração de pagamento</p>
          </div>
          <p className="text-xs text-muted-foreground">
            O admin ainda não configurou um gateway (Mercado Pago, Kiwify, Cakto...). Você pode
            continuar e registrar o pedido — o admin será avisado e pode liberar os créditos
            manualmente. Quando o gateway estiver ativo, o pagamento fica disponível aqui
            automaticamente.
          </p>
        </div>
      ) : (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Forma de pagamento</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {gateways.map((g) => {
              const active = gatewaySlug === g.slug;
              return (
                <button
                  key={g.slug}
                  type="button"
                  onClick={() => setGatewaySlug(g.slug)}
                  className={cn(
                    "rounded-xl border p-2.5 text-xs font-medium transition",
                    active
                      ? "border-primary/60 bg-primary/10 text-foreground"
                      : "border-border/70 bg-surface/60 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {g.nome}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {msg && <p className="mt-2 text-xs text-red-400">{msg}</p>}

      <button
        onClick={onConfirm}
        disabled={creating}
        className={`${primaryBtn} mt-3 flex items-center justify-center gap-2`}
      >
        {creating ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ShoppingCart className="size-4" />
        )}
        {creating
          ? "Processando..."
          : semGateway
            ? `Registrar pedido — ${brl(valorFinal)}`
            : `Continuar — ${brl(valorFinal)}`}
      </button>

      {authed === false && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Você será direcionado para criar sua conta antes do pagamento.
        </p>
      )}
    </AuthShell>
  );
}
