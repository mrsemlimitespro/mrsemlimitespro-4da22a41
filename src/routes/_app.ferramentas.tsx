import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, Package, Wand2, Download } from "lucide-react";

import { HubTabs, type HubTab } from "@/components/hub-tabs";

export const Route = createFileRoute("/_app/ferramentas")({
  head: () => ({
    meta: [
      { title: "Ferramentas — MR Sem Limites" },
      {
        name: "description",
        content: "Central de ferramentas: Agents, Packs, Prompts e Extensão.",
      },
      { property: "og:title", content: "Ferramentas — MR Sem Limites" },
      {
        property: "og:description",
        content: "Acesse Agents, Packs, Prompts e a Extensão em um único hub.",
      },
    ],
  }),
  component: FerramentasHub,
});

export const ferramentasTabs: HubTab[] = [
  { label: "Agents", to: "/agents", icon: Bot, match: ["/agents"] },
  { label: "Packs", to: "/packs", icon: Package, match: ["/packs"] },
  { label: "Prompts", to: "/prompts", icon: Wand2, match: ["/prompts"] },
  { label: "Extensão", to: "/baixar-extensao", icon: Download, match: ["/baixar-extensao"] },
];

const cards = [
  {
    to: "/agents",
    title: "Agents",
    description: "Biblioteca completa de agents com atividade em tempo real.",
    icon: Bot,
    color: "var(--brand-magenta)",
  },
  {
    to: "/packs",
    title: "Packs Premium",
    description: "Pacotes prontos, downloads e integrações.",
    icon: Package,
    color: "var(--brand-blue)",
  },
  {
    to: "/prompts",
    title: "AI Prompts",
    description: "Biblioteca inteligente de prompts para todas as áreas.",
    icon: Wand2,
    color: "var(--brand-orange)",
  },
  {
    to: "/baixar-extensao",
    title: "Extensão",
    description: "Download e status da sua extensão MR Sem Limites.",
    icon: Download,
    color: "var(--brand-emerald)",
  },
];

function FerramentasHub() {
  return (
    <div>
      <HubTabs tabs={ferramentasTabs} />
      <header className="mb-6">
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">Ferramentas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tudo que você precisa para operar em um só lugar.
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
