import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";

export const Route = createFileRoute("/_app/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — MR Lova" },
      { name: "description", content: "Perfil do usuário no MR Lova." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <PerfilPage />
    </RequireAuth>
  ),
});

function PerfilPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Perfil</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Envie o print desta tela para eu reconstruí-la fielmente.
      </p>
    </div>
  );
}
