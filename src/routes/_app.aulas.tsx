import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap, PlayCircle, Search, Sparkles } from "lucide-react";
import { RequireAuth } from "@/components/require-auth";

export const Route = createFileRoute("/_app/aulas")({
  head: () => ({
    meta: [
      { title: "Aulas — MR Lova" },
      { name: "description", content: "Aulas e treinamentos do MR Lova." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AulasPage />
    </RequireAuth>
  ),
});

function AulasPage() {
  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <GraduationCap className="size-3.5" strokeWidth={2} />
          Treinamentos
        </div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          <span className="gradient-text-warm">Aulas</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Aprenda a extrair o máximo da plataforma com os treinamentos oficiais.
        </p>
      </header>

      {/* Search */}
      <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
        <Search className="size-4 text-muted-foreground" strokeWidth={2} />
        <input
          type="search"
          placeholder="Buscar aula por título ou tópico…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
        />
      </div>

      {/* Empty state */}
      <div className="glass relative overflow-hidden rounded-2xl p-14">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 50% 30%, color-mix(in oklab, var(--brand-violet) 22%, transparent), transparent 60%)",
          }}
        />
        <div className="relative flex flex-col items-center justify-center gap-5 py-10 text-center">
          <span
            className="grid size-16 place-items-center rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in oklab, var(--brand-violet) 40%, transparent), color-mix(in oklab, var(--brand-blue) 30%, transparent))",
              boxShadow: "0 0 40px -6px color-mix(in oklab, var(--brand-violet) 70%, transparent)",
            }}
          >
            <PlayCircle className="size-7 text-white" strokeWidth={2} />
          </span>
          <div className="space-y-1.5">
            <h3 className="text-xl font-semibold tracking-tight">Em breve, novas aulas</h3>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              Estamos preparando conteúdos exclusivos para você. Volte em breve para assistir aos
              treinamentos oficiais do MR Lova.
            </p>
          </div>
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-foreground/80"
            style={{
              background: "color-mix(in oklab, var(--brand-violet) 18%, transparent)",
              border: "1px solid color-mix(in oklab, var(--brand-violet) 35%, transparent)",
            }}
          >
            <Sparkles className="size-3" strokeWidth={2} />
            Novos vídeos em breve
          </div>
        </div>
      </div>
    </div>
  );
}
