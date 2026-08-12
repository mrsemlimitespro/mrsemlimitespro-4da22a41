import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Coins, Flame, Package, ShoppingCart, Sparkles, UserCircle2, Zap } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getPreset } from "@/lib/gradient-presets";
import { RequireAuth } from "@/components/require-auth";

export const Route = createFileRoute("/_app/creditos")({
  head: () => ({
    meta: [
      { title: "Loja — MR sem limites" },
      { name: "description", content: "Loja de chaves, créditos e planos." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <LojaPage />
    </RequireAuth>
  ),
});

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

type Tab = { id: string; label: string; icon: IconType };
const tabs: Tab[] = [
  { id: "loja", label: "Loja", icon: ShoppingCart },
  { id: "meus-clientes", label: "Meus Clientes", icon: UserCircle2 },
  { id: "meu-estoque", label: "Meu Estoque", icon: Package },
  { id: "creditos", label: "Créditos Lovable", icon: Coins },
];

type Pack = {
  id: string;
  nome: string;
  quantidade: number;
  preco: number;
  descricao: string | null;
  imagem_url: string | null;
  badge: string | null;
  cor_gradiente: string | null;
  ativo: boolean;
};

type Plano = {
  id: string;
  nome: string;
  tipo: string | null;
  preco: number;
  creditos_incluidos: number;
  duracao_dias: number;
  descricao: string | null;
  imagem_url: string | null;
  badge: string | null;
  cor_gradiente: string | null;
  ativo: boolean;
};

type Promo = {
  id: string;
  titulo: string;
  descricao: string | null;
  imagem_url: string | null;
  desconto_percentual: number | null;
  inicio: string | null;
  fim: string | null;
  plano_id: string | null;
  pack_id: string | null;
  link: string | null;
};

const brl = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;

function LojaPage() {
  const [active, setActive] = useState("loja");

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6">
      <div className="glass inline-flex flex-wrap items-center gap-1 rounded-2xl p-1.5">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={cn(
                "relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "text-primary-foreground"
                  : "text-foreground/70 hover:text-foreground hover:bg-white/5",
              )}
            >
              {isActive && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-xl gradient-primary"
                  style={{
                    boxShadow: "0 0 20px -2px color-mix(in oklab, var(--primary) 75%, transparent)",
                  }}
                />
              )}
              <Icon className="relative z-10 size-4" strokeWidth={2} />
              <span className="relative z-10">{t.label}</span>
            </button>
          );
        })}
      </div>

      {active === "loja" ? (
        <LojaContent />
      ) : (
        <div className="glass rounded-2xl p-14 text-center text-sm text-muted-foreground">
          Em breve.
        </div>
      )}
    </div>
  );
}

function LojaContent() {
  const packsQ = useQuery({
    queryKey: ["loja-packs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("creditos_packs")
        .select("id,nome,quantidade,preco,descricao,imagem_url,badge,cor_gradiente,ativo")
        .eq("ativo", true)
        .order("quantidade", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Pack[];
    },
  });

  const planosQ = useQuery({
    queryKey: ["loja-planos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planos")
        .select(
          "id,nome,tipo,preco,creditos_incluidos,duracao_dias,descricao,imagem_url,badge,cor_gradiente,ativo",
        )
        .eq("ativo", true)
        .order("preco", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Plano[];
    },
  });

  const promoQ = useQuery({
    queryKey: ["loja-promo-vitalicia"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("promocoes")
        .select(
          "id,titulo,descricao,imagem_url,desconto_percentual,inicio,fim,plano_id,pack_id,link",
        )
        .eq("ativo", true)
        .or(`inicio.is.null,inicio.lte.${now}`)
        .or(`fim.is.null,fim.gte.${now}`)
        .order("created_at", { ascending: false })
        .limit(1);
      return ((data ?? []) as Promo[])[0] ?? null;
    },
  });

  const packs = packsQ.data ?? [];
  const planos = planosQ.data ?? [];
  const promo = promoQ.data ?? null;
  const loading = packsQ.isLoading || planosQ.isLoading;
  const empty = !loading && packs.length === 0 && planos.length === 0 && !promo;

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <ShoppingCart className="size-5 text-primary" strokeWidth={2} />
              Comprar <span className="gradient-text-warm">Chaves</span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pacotes de créditos e planos — clique em qualquer card para ir ao checkout.
            </p>
          </div>
        </div>

        {loading && (
          <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
            Carregando...
          </div>
        )}

        {empty && (
          <div className="glass rounded-2xl p-10 text-center">
            <p className="text-sm text-muted-foreground">Nenhum produto cadastrado ainda.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              O admin pode adicionar cards em <span className="font-mono">/admin/loja</span> →
              Pacotes de Créditos ou Planos.
            </p>
          </div>
        )}

        {(packs.length > 0 || planos.length > 0) && (
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
            {packs.map((p) => (
              <PackCard key={p.id} pack={p} />
            ))}
            {planos.map((p) => (
              <PlanoCard key={p.id} plano={p} />
            ))}
          </div>
        )}
      </section>

      {promo && <PromoBanner promo={promo} />}
    </div>
  );
}

/* ---------------- Cards ---------------- */

function PackCard({ pack }: { pack: Pack }) {
  const preset = getPreset(pack.cor_gradiente);
  const unit = pack.quantidade > 0 ? pack.preco / pack.quantidade : pack.preco;
  const chaveLabel = pack.quantidade === 1 ? "chave" : "chaves";

  return (
    <Link
      to="/checkout"
      search={{ pack: pack.id } as never}
      className="glass group relative flex flex-col items-center overflow-hidden rounded-2xl p-5 text-center transition-transform hover:-translate-y-0.5"
    >
      {pack.badge && (
        <span
          className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
          style={{ background: preset.button, boxShadow: `0 0 16px -2px ${preset.button}` }}
        >
          {pack.badge}
        </span>
      )}

      <span
        className="mt-2 grid size-14 place-items-center overflow-hidden rounded-2xl"
        style={{
          background: preset.gradient,
          boxShadow: `0 0 22px -6px ${preset.button}`,
        }}
      >
        {pack.imagem_url ? (
          <img
            src={pack.imagem_url}
            alt={pack.nome}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <Zap className="size-6 text-white" strokeWidth={2.5} />
        )}
      </span>

      <p className="mt-3 text-3xl font-semibold tracking-tight">{pack.quantidade}</p>
      <p className="text-xs text-muted-foreground">{chaveLabel}</p>

      <div className="mt-4 w-full rounded-xl border border-border/60 bg-white/[0.03] px-3 py-3">
        <p className="gradient-text-warm text-xl font-semibold">{brl(pack.preco)}</p>
        <p className="text-[11px] text-muted-foreground">{pack.nome}</p>
      </div>

      {pack.quantidade > 1 && (
        <p className="mt-3 text-xs text-muted-foreground">{brl(unit)} por chave</p>
      )}

      <Button
        className="mt-4 w-full rounded-xl border border-border/70 bg-white/[0.03] font-medium hover:bg-white/[0.06]"
        variant="ghost"
        asChild
      >
        <span>
          <ShoppingCart className="size-4" strokeWidth={2} />
          Comprar
        </span>
      </Button>
    </Link>
  );
}

function PlanoCard({ plano }: { plano: Plano }) {
  const preset = getPreset(plano.cor_gradiente ?? "violet");
  const darkText = preset.badge === "dark";

  return (
    <Link
      to="/checkout"
      search={{ plano: plano.id } as never}
      className="group relative flex flex-col overflow-hidden rounded-2xl border p-5 transition-transform duration-300 hover:-translate-y-0.5"
      style={{
        background: preset.gradient,
        borderColor: "color-mix(in oklab, white 20%, transparent)",
        boxShadow: `0 20px 50px -18px oklch(0 0 0 / 55%), 0 0 40px -8px ${preset.button}`,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, white 25%, transparent) 0%, transparent 100%)",
        }}
      />

      <div className="relative flex items-center justify-between">
        {plano.badge ? (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
              darkText ? "bg-black/70 text-white" : "bg-white/25 text-white backdrop-blur",
            )}
          >
            {plano.badge}
          </span>
        ) : (
          <span />
        )}
        <Sparkles className="size-4 text-white/80" strokeWidth={2} />
      </div>

      {plano.imagem_url && (
        <div className="relative mt-3 h-20 w-full overflow-hidden rounded-xl">
          <img
            src={plano.imagem_url}
            alt={plano.nome}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      )}

      <div className="relative mt-4 flex-1">
        <h3 className="text-lg font-bold uppercase tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
          {plano.nome}
        </h3>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/85">
          {plano.creditos_incluidos.toLocaleString("pt-BR")} CRÉDITOS
          {plano.duracao_dias ? ` · ${plano.duracao_dias} DIAS` : ""}
        </p>

        <div className="mt-4 flex items-baseline gap-1 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
          <span className="text-sm font-semibold">R$</span>
          <span className="text-4xl font-black tracking-tight">
            {Math.floor(Number(plano.preco))}
          </span>
          <span className="text-xl font-bold">,{Number(plano.preco).toFixed(2).split(".")[1]}</span>
        </div>
      </div>

      <div
        className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 font-semibold text-white shadow-lg"
        style={{
          background: `linear-gradient(135deg, color-mix(in oklab, ${preset.button} 90%, black), ${preset.button})`,
          boxShadow: `0 8px 24px -4px ${preset.button}`,
        }}
      >
        <ShoppingCart className="size-4" strokeWidth={2.5} />
        Comprar por {brl(Number(plano.preco))}
      </div>
    </Link>
  );
}

function PromoBanner({ promo }: { promo: Promo }) {
  const search: Record<string, string> = { promo: promo.id };
  if (promo.plano_id) search.plano = promo.plano_id;
  if (promo.pack_id) search.pack = promo.pack_id;

  return (
    <Link
      to="/checkout"
      search={search as never}
      className="group relative flex overflow-hidden rounded-2xl border p-6"
      style={{
        borderColor: "color-mix(in oklab, var(--primary) 55%, transparent)",
        background:
          "linear-gradient(135deg, color-mix(in oklab, var(--brand-magenta) 12%, var(--surface)) 0%, color-mix(in oklab, var(--brand-orange) 8%, var(--surface)) 100%)",
        boxShadow:
          "0 0 0 1px color-mix(in oklab, var(--primary) 30%, transparent), 0 0 50px -10px color-mix(in oklab, var(--primary) 60%, transparent)",
      }}
    >
      <div className="flex flex-wrap items-center gap-6">
        <span
          className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full"
          style={{
            background: "linear-gradient(135deg, var(--brand-magenta), var(--brand-orange))",
            boxShadow: "0 0 24px -4px color-mix(in oklab, var(--brand-magenta) 70%, transparent)",
          }}
        >
          {promo.imagem_url ? (
            <img
              src={promo.imagem_url}
              alt={promo.titulo}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <Flame className="size-6 text-white" strokeWidth={2} />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              Promoção Relâmpago
            </span>
            {promo.desconto_percentual ? (
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                -{Number(promo.desconto_percentual)}%
              </span>
            ) : null}
          </div>

          <h3 className="mt-2 text-2xl font-semibold tracking-tight">
            <span className="gradient-text-warm">{promo.titulo}</span>
          </h3>
          {promo.descricao && (
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">{promo.descricao}</p>
          )}
        </div>

        <div className="rounded-xl gradient-primary px-4 py-2.5 font-semibold text-primary-foreground shadow-lg">
          <ShoppingCart className="mr-2 inline size-4" strokeWidth={2.5} />
          Aproveitar
        </div>
      </div>
    </Link>
  );
}
