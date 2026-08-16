import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Sparkles, Users, Wallet, ShieldCheck, Megaphone, LineChart, Headphones } from "lucide-react";

import { BRAND_NAME } from "@/components/brand";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/quero-ser-revendedor")({
  head: () => ({
    meta: [
      { title: "Quero ser Revendedor — MR Sem Limites" },
      {
        name: "description",
        content:
          "Torne-se revendedor oficial MR Sem Limites por uma taxa única de R$ 29,90. Painel exclusivo, gere licenças ilimitadas, defina seus preços e crie promoções.",
      },
      { property: "og:title", content: "Seja Revendedor — MR Sem Limites" },
      {
        property: "og:description",
        content:
          "Taxa única de R$ 29,90. Painel exclusivo, licenças ilimitadas, promoções, cupons e comunidade privada.",
      },
    ],
  }),
  component: QueroSerRevendedorPage,
});

const VANTAGENS = [
  { icon: Wallet, titulo: "Venda suas próprias licenças", descricao: "Gere chaves ilimitadas e defina seus preços." },
  { icon: Megaphone, titulo: "Crie promoções e cupons", descricao: "Rode campanhas próprias para sua base de clientes." },
  { icon: LineChart, titulo: "Você define seus preços", descricao: "Compre acesso ao painel e revenda pelo valor que quiser — 100% do lucro é seu." },
  { icon: ShieldCheck, titulo: "Painel exclusivo", descricao: "Dashboard completo separado da área pública." },
  { icon: Users, titulo: "Comunidade privada", descricao: "Grupo restrito só para revendedores oficiais." },
  { icon: Headphones, titulo: "Suporte prioritário", descricao: "Atendimento humano direto no WhatsApp." },
];

const INCLUSO = [
  "Painel de revendedor completo",
  "Geração ilimitada de licenças",
  "Cadastro e gestão de clientes",
  "Criação de promoções e cupons",
  "Restauração de dispositivos",
  "Relatórios de vendas e desempenho",
  "Acesso à comunidade exclusiva",
  "Sem mensalidade — pagamento único",
];

function QueroSerRevendedorPage() {
  const { data: cfg } = useQuery({
    queryKey: ["revendedor-checkout-url"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("admin_settings")
        .select("kiwify_checkout_url_revendedor,painel_revendedor_valor")
        .limit(1)
        .maybeSingle();
      return data as { kiwify_checkout_url_revendedor: string | null; painel_revendedor_valor: number | null } | null;
    },
    staleTime: 60_000,
  });
  const kiwifyUrl = cfg?.kiwify_checkout_url_revendedor?.trim() || "";
  const valor = cfg?.painel_revendedor_valor ?? 29.9;
  const valorFmt = valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const CtaButton = ({ label }: { label: string }) =>
    kiwifyUrl ? (
      <a
        href={kiwifyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg transition hover:opacity-90"
      >
        {label} <ArrowRight className="size-4" />
      </a>
    ) : (
      <Link
        to="/checkout"
        className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg transition hover:opacity-90"
      >
        {label} <ArrowRight className="size-4" />
      </Link>
    );

  return (
    <div className="mx-auto w-full max-w-[1080px] space-y-10 pb-24">

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl p-8 text-center md:p-14"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklab, var(--brand-magenta) 22%, transparent), color-mix(in oklab, var(--brand-blue) 22%, transparent))",
          boxShadow:
            "0 0 0 1px color-mix(in oklab, var(--brand-magenta) 40%, transparent), 0 0 80px -10px color-mix(in oklab, var(--brand-blue) 40%, transparent)",
        }}
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
          <Sparkles className="size-3" /> Programa Oficial de Revenda
        </span>
        <h1 className="mt-4 gradient-text-warm text-3xl font-black tracking-tight md:text-5xl">
          Seja Revendedor {BRAND_NAME}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
          Ative seu painel de revenda por uma <strong className="text-foreground">taxa única de R$ {valorFmt}</strong>.
          Sem mensalidade. Sem renovação. Comece a faturar hoje mesmo.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <CtaButton label={`Ativar por R$ ${valorFmt}`} />
          <a
            href="#vantagens"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-bold text-foreground transition hover:bg-white/10"
          >
            Ver vantagens
          </a>
        </div>

        <p className="mt-4 text-[11px] uppercase tracking-widest text-muted-foreground">
          Pagamento único • Acesso vitalício ao painel • Suporte incluído
        </p>
      </section>

      {/* Vantagens */}
      <section id="vantagens" className="space-y-3">
        <h2 className="section-title">
          <span aria-hidden className="section-title-bar" /> O que você ganha
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {VANTAGENS.map((v) => {
            const Icon = v.icon;
            return (
              <div key={v.titulo} className="card-premium card-premium-hover flex flex-col gap-3 rounded-2xl p-5"
                style={{ ["--tile-color" as never]: "var(--brand-magenta)" }}
              >
                <span className="icon-tile size-12">
                  <Icon className="size-5" strokeWidth={2} />
                </span>
                <div>
                  <p className="text-base font-semibold">{v.titulo}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{v.descricao}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Incluso */}
      <section className="space-y-3">
        <h2 className="section-title">
          <span aria-hidden className="section-title-bar" /> Tudo isso está incluído
        </h2>
        <div className="glass rounded-2xl p-6 md:p-8">
          <ul className="grid gap-3 sm:grid-cols-2">
            {INCLUSO.map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA final */}
      <section className="glass flex flex-col items-center gap-4 rounded-3xl p-8 text-center md:p-12">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Taxa única</p>
        <p className="gradient-text-warm text-5xl font-black md:text-6xl">R$ {valorFmt}</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Um único pagamento libera o painel de revendedor para sempre. Sem assinatura, sem cobrança recorrente.
        </p>
        <CtaButton label="Quero ser Revendedor agora" />
        <p className="text-[11px] text-muted-foreground">
          Já tem conta?{" "}
          <Link to="/login" className="text-foreground underline">Entrar</Link>
        </p>
      </section>
    </div>
  );
}
