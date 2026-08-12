import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { getPremiumPackBySlug } from "@/lib/premium-packs/packs.functions";
import { PackDetailPage } from "@/components/premium-packs/PackDetailPage";
import { RequireAuth } from "@/components/require-auth";

export const Route = createFileRoute("/_app/packs/$slug")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Pack Premium — MR Sem Limites" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <RequireAuth>
      <PackDetailRoute />
    </RequireAuth>
  ),
  notFoundComponent: PackNotFound,
  errorComponent: PackError,
});

function PackDetailRoute() {
  const { slug } = Route.useParams();
  const getBySlug = useServerFn(getPremiumPackBySlug);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["premium-pack", slug],
    queryFn: () => getBySlug({ data: { slug } }),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div
        data-ai-theme="packs"
        className="ai-module grid min-h-[60vh] place-items-center bg-black text-white"
      >
        <Loader2 className="h-8 w-8 animate-spin text-ai-200" />
      </div>
    );
  }

  if (isError || !data) throw notFound();

  return <PackDetailPage pack={data} />;
}

function PackNotFound() {
  const router = useRouter();
  return (
    <div
      data-ai-theme="packs"
      className="ai-module grid min-h-[60vh] place-items-center bg-black text-white text-center px-6"
    >
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Pack não encontrado</h1>
        <p className="mb-6 text-sm text-white/60">
          O pack solicitado pode ter sido despublicado ou o link está incorreto.
        </p>
        <button
          type="button"
          onClick={() => router.navigate({ to: "/packs" })}
          className="inline-flex items-center gap-2 rounded-full border border-ai-300/40 bg-ai-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-ai-50 hover:border-ai-300/70"
        >
          Voltar aos Packs
        </button>
      </div>
    </div>
  );
}

function PackError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div
      data-ai-theme="packs"
      className="ai-module grid min-h-[60vh] place-items-center bg-black text-white text-center px-6"
    >
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Não foi possível carregar o pack</h1>
        <p className="mb-6 text-sm text-white/60">{error.message}</p>
        <button
          type="button"
          onClick={() => {
            reset();
            router.invalidate();
          }}
          className="inline-flex items-center gap-2 rounded-full border border-ai-300/40 bg-ai-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-ai-50 hover:border-ai-300/70"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
