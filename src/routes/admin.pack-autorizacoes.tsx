import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Trash2, Search, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminListPremiumPacks } from "@/lib/premium-packs/admin.functions";
import {
  listAdminAuthorizations,
  grantAdminToReseller,
  revokeAdminAuthorization,
} from "@/lib/premium-packs/authorizations.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/pack-autorizacoes")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Autorizações de Packs — Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: PackAuthorizationsPage,
});

type Reseller = { id: string; nome: string | null; email: string | null };

function PackAuthorizationsPage() {
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const listFn = useServerFn(adminListPremiumPacks);
  const { data: packsData, isLoading: loadingPacks } = useQuery({
    queryKey: ["admin-premium-packs"],
    queryFn: () => listFn({ data: { limit: 200 } }),
  });
  const packs = (packsData?.rows ?? []) as Array<{
    id: string;
    nome: string;
    slug: string;
    categoria: string | null;
  }>;

  const filtered = useMemo(() => {
    if (!query.trim()) return packs;
    const q = query.toLowerCase();
    return packs.filter(
      (p) => p.nome.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
    );
  }, [packs, query]);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
      <section className="glass rounded-2xl p-4">
        <div className="mb-3 flex items-center gap-2">
          <Package className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Packs Premium</h2>
        </div>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar pack..."
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-8 pr-3 text-xs outline-none"
          />
        </div>
        <div className="max-h-[70vh] space-y-1 overflow-y-auto pr-1">
          {loadingPacks && (
            <Loader2 className="mx-auto my-6 size-4 animate-spin text-muted-foreground" />
          )}
          {!loadingPacks && filtered.length === 0 && (
            <div className="rounded-lg border border-dashed border-white/10 p-4 text-center text-xs text-muted-foreground">
              Nenhum pack encontrado. Cadastre um pack em /admin/loja ou pelo módulo de packs.
            </div>
          )}
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPackId(p.id)}
              className={
                "w-full rounded-lg border px-3 py-2 text-left text-xs transition " +
                (selectedPackId === p.id
                  ? "border-ai-300/40 bg-ai-500/15 text-foreground"
                  : "border-white/10 bg-white/[0.02] text-foreground/80 hover:border-white/20")
              }
            >
              <div className="font-semibold">{p.nome}</div>
              <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                {p.categoria ?? "—"} · {p.slug}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="glass rounded-2xl p-6">
        {!selectedPackId ? (
          <div className="grid h-full min-h-[40vh] place-items-center text-center text-sm text-muted-foreground">
            <div className="max-w-sm">
              <ShieldCheck className="mx-auto mb-3 size-8" />
              <h3 className="text-base font-semibold text-foreground">Selecione um pack</h3>
              <p className="mt-2 text-xs">
                Escolha um pack à esquerda para autorizar revendedores. Cada revendedor autorizado
                poderá liberar o pack aos próprios clientes.
              </p>
            </div>
          </div>
        ) : (
          <PackAuthorizationEditor packId={selectedPackId} />
        )}
      </section>
    </div>
  );
}

function PackAuthorizationEditor({ packId }: { packId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listAdminAuthorizations);
  const grantFn = useServerFn(grantAdminToReseller);
  const revokeFn = useServerFn(revokeAdminAuthorization);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pack-authorizations", packId],
    queryFn: () => listFn({ data: { pack_id: packId } }),
  });

  const { data: resellers } = useQuery({
    queryKey: ["revendedores-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revendedores")
        .select("id, nome, email")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Reseller[];
    },
    staleTime: 60_000,
  });

  const [chosenReseller, setChosenReseller] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");

  const grantMut = useMutation({
    mutationFn: (input: {
      revendedor_id: string;
      expires_at: string | null;
      notes: string | null;
    }) =>
      grantFn({
        data: {
          pack_id: packId,
          revendedor_id: input.revendedor_id,
          expires_at: input.expires_at,
          notes: input.notes,
        },
      }),
    onSuccess: () => {
      toast.success("Revendedor autorizado");
      setChosenReseller("");
      setExpiresAt("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["pack-authorizations", packId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao autorizar"),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => revokeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Autorização revogada");
      refetch();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao revogar"),
  });

  const rows = (data?.rows ?? []) as Array<{
    id: string;
    status: string;
    expires_at: string | null;
    notes: string | null;
    created_at: string;
    revendedores: { id: string; nome: string | null; email: string | null } | null;
  }>;

  const authorizedIds = new Set(
    rows.filter((r) => r.status === "active").map((r) => r.revendedores?.id),
  );
  const availableResellers = (resellers ?? []).filter((r) => !authorizedIds.has(r.id));

  return (
    <div className="space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Autorizações
        </div>
        <h2 className="mt-1 text-xl font-semibold">
          Revendedores autorizados a distribuir este pack
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Um revendedor autorizado aqui poderá liberar o mesmo pack para os clientes dele. Sem essa
          autorização, nem o revendedor nem os clientes dele conseguem baixar o pack.
        </p>
      </header>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Autorizar novo revendedor
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr,180px,auto]">
          <select
            value={chosenReseller}
            onChange={(e) => setChosenReseller(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none"
          >
            <option value="">Selecionar revendedor…</option>
            {availableResellers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome ?? r.email ?? r.id}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none"
            placeholder="Expira em"
          />
          <Button
            className="gradient-primary"
            disabled={!chosenReseller || grantMut.isPending}
            onClick={() =>
              grantMut.mutate({
                revendedor_id: chosenReseller,
                expires_at: expiresAt ? new Date(expiresAt + "T23:59:59").toISOString() : null,
                notes: notes || null,
              })
            }
          >
            {grantMut.isPending ? <Loader2 className="size-4 animate-spin" /> : "Autorizar"}
          </Button>
        </div>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observação (opcional)"
          className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-xs">
          <thead className="bg-white/[0.03] text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Revendedor</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Expira</th>
              <th className="p-3 text-left">Criado</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="p-6 text-center">
                  <Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" />
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  Nenhum revendedor autorizado ainda.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/5">
                <td className="p-3">
                  <div className="font-semibold">{r.revendedores?.nome ?? "—"}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {r.revendedores?.email ?? ""}
                  </div>
                </td>
                <td className="p-3">
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider " +
                      (r.status === "active"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-red-500/15 text-red-300")
                    }
                  >
                    {r.status}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground">
                  {r.expires_at ? new Date(r.expires_at).toLocaleDateString("pt-BR") : "—"}
                </td>
                <td className="p-3 text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="p-3 text-right">
                  {r.status === "active" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => revokeMut.mutate(r.id)}
                      disabled={revokeMut.isPending}
                      className="text-red-300 hover:text-red-200"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
