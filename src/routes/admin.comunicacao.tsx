import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Mail,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Save,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/comunicacao")({
  head: () => ({
    meta: [{ title: "Comunicação — Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: ComunicacaoAdmin,
});

type Tab = "fila" | "enviados" | "falhas" | "templates" | "logs";

function ComunicacaoAdmin() {
  const [tab, setTab] = useState<Tab>("fila");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Comunicação
        </div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          <span className="gradient-text-warm">Emails</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Fila, envios, falhas, templates e logs.
        </p>
      </header>

      <nav className="glass flex flex-wrap gap-1 rounded-2xl p-1">
        {(
          [
            ["fila", "Fila", Clock],
            ["enviados", "Enviados", CheckCircle2],
            ["falhas", "Falhas", AlertTriangle],
            ["templates", "Templates", FileText],
            ["logs", "Logs", Mail],
          ] as [Tab, string, any][]
        ).map(([k, label, Icon]) => {
          const active = tab === k;
          return (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-white/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          );
        })}
      </nav>

      {tab === "fila" && <FilaTab status="pending" />}
      {tab === "enviados" && <FilaTab status="sent" />}
      {tab === "falhas" && <FilaTab status="failed" />}
      {tab === "templates" && <TemplatesTab />}
      {tab === "logs" && <LogsTab />}
    </div>
  );
}

function FilaTab({ status }: { status: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-email-queue", status],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("email_queue")
        .select(
          "id,template_chave,destinatario,assunto,status,attempts,last_error,scheduled_for,sent_at,created_at",
        )
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const reenviar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("email_queue")
        .update({ status: "pending", scheduled_for: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reagendado para envio.");
      qc.invalidateQueries({ queryKey: ["admin-email-queue"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );

  if (!data || data.length === 0)
    return (
      <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
        Nenhum email nesta lista.
      </div>
    );

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr className="border-b border-white/5">
              <th className="px-4 py-3">Template</th>
              <th className="px-4 py-3">Destino</th>
              <th className="px-4 py-3">Assunto</th>
              <th className="px-4 py-3">Tentativas</th>
              <th className="px-4 py-3">Erro</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r: any) => (
              <tr key={r.id} className="border-b border-white/5 last:border-b-0">
                <td className="px-4 py-3 text-xs">{r.template_chave}</td>
                <td className="px-4 py-3 text-xs">{r.destinatario}</td>
                <td className="px-4 py-3 text-xs">{r.assunto}</td>
                <td className="px-4 py-3 text-xs">{r.attempts}</td>
                <td className="px-4 py-3 text-xs text-rose-300">{r.last_error || "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-right">
                  {status !== "sent" && (
                    <Button size="sm" variant="ghost" onClick={() => reenviar.mutate(r.id)}>
                      <RefreshCw className="mr-1 size-3" /> Reenviar
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

function TemplatesTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-email-templates"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("email_templates")
        .select("*")
        .order("chave");
      return data ?? [];
    },
  });
  const [editando, setEditando] = useState<any | null>(null);

  const salvar = useMutation({
    mutationFn: async (t: any) => {
      const { error } = await (supabase as any)
        .from("email_templates")
        .update({ assunto: t.assunto, html: t.html, texto: t.texto, ativo: t.ativo })
        .eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template salvo.");
      setEditando(null);
      qc.invalidateQueries({ queryKey: ["admin-email-templates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {(data ?? []).map((t: any) => (
        <div key={t.id} className="glass rounded-2xl p-4">
          <div className="mb-1 flex items-center justify-between">
            <div className="font-semibold">{t.nome}</div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {t.chave}
            </span>
          </div>
          <div className="mb-3 text-xs text-muted-foreground">{t.assunto}</div>
          <Button size="sm" variant="secondary" onClick={() => setEditando(t)}>
            Editar
          </Button>
        </div>
      ))}

      {editando && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="glass w-full max-w-3xl rounded-2xl p-6">
            <div className="mb-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {editando.chave}
              </div>
              <h2 className="text-xl font-semibold">{editando.nome}</h2>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Assunto</Label>
                <Input
                  value={editando.assunto}
                  onChange={(e) => setEditando({ ...editando, assunto: e.target.value })}
                />
              </div>
              <div>
                <Label>HTML</Label>
                <Textarea
                  rows={10}
                  value={editando.html}
                  onChange={(e) => setEditando({ ...editando, html: e.target.value })}
                />
              </div>
              <div>
                <Label>Texto simples</Label>
                <Textarea
                  rows={3}
                  value={editando.texto ?? ""}
                  onChange={(e) => setEditando({ ...editando, texto: e.target.value })}
                />
              </div>
              <div className="text-[10px] text-muted-foreground">
                Variáveis disponíveis:{" "}
                {(editando.variaveis as string[])?.map((v) => `{{${v}}}`).join(" · ")} ·{" "}
                {"{{link_download}}, {{link_manual}}, {{link_suporte}}, {{link_portal}}"}
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
              <Button
                className="gradient-primary"
                disabled={salvar.isPending}
                onClick={() => salvar.mutate(editando)}
              >
                <Save className="mr-1 size-4" /> Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LogsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-email-logs"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("email_logs")
        .select("id,queue_id,evento,detalhes,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  if (isLoading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="glass rounded-2xl p-4">
      <ul className="space-y-1 text-xs">
        {(data ?? []).map((l: any) => (
          <li key={l.id} className="flex items-start justify-between gap-3 border-b border-white/5 py-2 last:border-b-0">
            <div>
              <div
                className={cn(
                  "font-medium",
                  l.evento === "sent"
                    ? "text-emerald-300"
                    : l.evento === "failed"
                      ? "text-rose-300"
                      : "text-foreground",
                )}
              >
                {l.evento}
              </div>
              <div className="text-muted-foreground">
                {JSON.stringify(l.detalhes).slice(0, 200)}
              </div>
            </div>
            <div className="whitespace-nowrap text-muted-foreground">
              {new Date(l.created_at).toLocaleString("pt-BR")}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
