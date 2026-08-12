import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, UserCircle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/usuarios")({
  component: UsuariosPage,
});

function UsuariosPage() {
  // Lista usuários com papel definido (via user_roles) e clientes cadastrados como visão consolidada.
  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_roles")
        .select("user_id, role, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{ user_id: string; role: string; created_at: string }>;
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Contas</div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          <span className="gradient-text-warm">Usuários</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Contas e papéis (roles) cadastrados no sistema.
        </p>
      </header>

      <section className="glass overflow-hidden rounded-2xl">
        <div className="border-b border-white/5 bg-white/[0.02] px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground">
          Papéis de acesso
        </div>
        {loadingRoles ? (
          <div className="p-8 text-center">
            <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
          </div>
        ) : roles.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
            <UserCircle className="size-8" />
            <p>Nenhum papel atribuído ainda.</p>
            <p className="text-xs">
              Use a área <b>Segurança</b> para configurar a senha; os papéis são criados quando um
              usuário reivindica admin.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">ID do usuário</th>
                <th className="px-5 py-3 font-medium">Papel</th>
                <th className="px-5 py-3 font-medium">Concedido em</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr key={`${r.user_id}-${r.role}`} className="border-t border-white/5">
                  <td className="px-5 py-3 font-mono text-xs">{r.user_id}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                      {r.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
