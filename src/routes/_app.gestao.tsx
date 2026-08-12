import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, KeyRound, Store } from "lucide-react";

import { HubTabs, type HubTab } from "@/components/hub-tabs";
import { useUserRole } from "@/hooks/useUserRole";

export const Route = createFileRoute("/_app/gestao")({
  head: () => ({
    meta: [
      { title: "Gestão — MR Sem Limites" },
      {
        name: "description",
        content: "Central de gestão: clientes, licenças e revendedores.",
      },
      { property: "og:title", content: "Gestão — MR Sem Limites" },
      {
        property: "og:description",
        content: "Gerencie clientes, licenças e revendedores em um só hub.",
      },
    ],
  }),
  component: GestaoHub,
});

const baseTabs: HubTab[] = [
  { label: "Clientes", to: "/clientes", icon: Users, match: ["/clientes"] },
  { label: "Licenças", to: "/licencas", icon: KeyRound, match: ["/licencas"] },
];

const adminTab: HubTab = {
  label: "Revendedores",
  to: "/admin/revendedores-gestao",
  icon: Store,
  match: ["/admin/revendedores-gestao"],
  adminOnly: true,
};

function GestaoHub() {
  const role = useUserRole();
  const isAdmin = role === "admin";
  const tabs = isAdmin ? [...baseTabs, adminTab] : baseTabs;

  const cards = [
    {
      to: "/clientes",
      title: "Clientes",
      description: "Lista de clientes finais vinculados às licenças.",
      icon: Users,
      color: "var(--brand-blue)",
    },
    {
      to: "/licencas",
      title: "Licenças",
      description: "Emissão, controle e envio de testes. Aba teste para revendedor/admin.",
      icon: KeyRound,
      color: "var(--brand-magenta)",
    },
    ...(isAdmin
      ? [
          {
            to: "/admin/revendedores-gestao",
            title: "Revendedores",
            description:
              "Visão do administrador sobre todos os revendedores: cadastro, bloqueio, licenças emitidas.",
            icon: Store,
            color: "var(--brand-orange)",
          },
        ]
      : []),
  ];

  return (
    <div>
      <HubTabs tabs={tabs} />
      <header className="mb-6">
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">Gestão</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin
            ? "Administre clientes, licenças e revendedores."
            : "Administre seus clientes e licenças."}
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
