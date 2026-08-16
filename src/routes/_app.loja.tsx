import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingBag, Users, Boxes, Coins, KeyRound } from "lucide-react";

import { HubTabs, type HubTab } from "@/components/hub-tabs";

export const Route = createFileRoute("/_app/loja")({
  head: () => ({
    meta: [
      { title: "Loja — MR Sem Limites" },
      {
        name: "description",
        content: "Loja, meus clientes, estoque, créditos e compra de chaves.",
      },
      { property: "og:title", content: "Loja — MR Sem Limites" },
      {
        property: "og:description",
        content: "Comercial da MR Sem Limites em um único hub.",
      },
    ],
  }),
  component: LojaHub,
});

export const lojaTabs: HubTab[] = [
  { label: "Loja", to: "/creditos", icon: ShoppingBag, match: ["/creditos"] },
  { label: "Meus Clientes", to: "/clientes", icon: Users, match: ["/clientes"] },
  { label: "Estoque", to: "/dashboard", icon: Boxes, match: ["/dashboard"] },
  { label: "Comprar Chaves", to: "/licencas", icon: KeyRound, match: ["/licencas"] },
];

const cards = [
  {
    to: "/creditos",
    title: "Loja & Créditos",
    description: "Pacotes de créditos, planos e Créditos Lovable.",
    icon: Coins,
    color: "var(--brand-orange)",
  },
  {
    to: "/clientes",
    title: "Meus Clientes",
    description: "Clientes vinculados às suas licenças.",
    icon: Users,
    color: "var(--brand-blue)",
  },
  {
    to: "/dashboard",
    title: "Meu Estoque",
    description: "Visão geral do estoque e performance.",
    icon: Boxes,
    color: "var(--brand-emerald)",
  },
  {
    to: "/licencas",
    title: "Comprar Chaves",
    description: "Gere licenças, ative planos e envie testes.",
    icon: KeyRound,
    color: "var(--brand-magenta)",
  },
];

function LojaHub() {
  return (
    <div>
      <HubTabs tabs={lojaTabs} />
      <header className="mb-6">
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">Loja</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Créditos, chaves, clientes e estoque comercial.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.to}
              to={c.to}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-surface/40 p-5 transition-all hover:-translate-y-0.5 hover:border-border"
              style={{
                boxShadow: `0 0 0 1px oklch(1 0 0 / 4%), 0 8px 30px -12px color-mix(in oklab, ${c.color} 40%, transparent)`,
              }}
            >
              <div
                className="mb-4 grid size-12 place-items-center rounded-xl"
                style={{
                  background: `color-mix(in oklab, ${c.color} 22%, oklch(0 0 0 / 40%))`,
                  boxShadow: `0 0 0 1px color-mix(in oklab, ${c.color} 55%, transparent)`,
                }}
              >
                <Icon className="size-5" strokeWidth={2} />
              </div>
              <h3 className="text-lg font-bold">{c.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
