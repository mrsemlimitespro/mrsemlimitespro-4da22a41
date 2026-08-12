import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Clock, Coins, Loader2, Minus, Plus, Search, User } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/ajustar-creditos")({
  component: AjustarCreditosPage,
});

type Revendedor = {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  saldo_creditos: number | null;
  bloqueado: boolean | null;
  plano_expira_em: string | null;
};

type Movimento = {
  id: string;
  revendedor_id: string;
  delta: number;
  saldo_apos: number;
  motivo: string | null;
  created_at: string;
};

function AjustarCreditosPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"revendedores" | "pedidos">("revendedores");
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<Revendedor | null>(null);
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [qtd, setQtd] = useState<string>("10");
  const [motivo, setMotivo] = useState("");

  const { data: revendedores = [], isLoading } = useQuery({
    queryKey: ["admin-ajustar-creditos-revendedores"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("revendedores")
        .select("id, nome, email, telefone, saldo_creditos, bloqueado, plano_expira_em")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Revendedor[];
    },
    refetchInterval: 15000,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return revendedores;
    return revendedores.filter((r) =>
      [r.nome, r.email, r.telefone].some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [revendedores, search]);

  const { data: movimentos = [] } = useQuery({
    queryKey: ["admin-ajustar-creditos-mov", target?.id],
    enabled: !!target?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("creditos_movimentos")
        .select("id, revendedor_id, delta, saldo_apos, motivo, created_at")
        .eq("revendedor_id", target!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as Movimento[];
    },
  });

  const ajustar = useMutation({
    mutationFn: async () => {
      if (!target) throw new Error("Selecione um revendedor");
      const n = Number(qtd);
      if (!Number.isFinite(n) || n <= 0) throw new Error("Quantidade inválida");
      const delta = mode === "add" ? Math.floor(n) : -Math.floor(n);
      const { error } = await (supabase as any).rpc("add_credits", {
        _revendedor_id: target.id,
        _delta: delta,
        _motivo: motivo.trim() || (mode === "add" ? "ajuste:admin:credito" : "ajuste:admin:debito"),
        _ref_tipo: "ajuste_admin",
        _ref_id: null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(mode === "add" ? "Créditos adicionados" : "Créditos removidos");
      setMotivo("");
      setQtd("10");
      qc.invalidateQueries({ queryKey: ["admin-ajustar-creditos-revendedores"] });
      qc.invalidateQueries({ queryKey: ["admin-ajustar-creditos-mov"] });
      setTarget(null);
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Falha ao ajustar créditos");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Gestão
          </div>
          <h1 className="mt-1 text-2xl font-semibold">Ajustar créditos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Adicione ou remova créditos manualmente da conta de qualquer revendedor.
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou telefone"
            className="w-72 pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="glass inline-flex items-center gap-1 rounded-2xl p-1.5">
        {(["revendedores", "pedidos"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition",
              tab === t
                ? "gradient-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "revendedores" ? <User className="size-4" /> : <Clock className="size-4" />}
            {t === "revendedores" ? "Revendedores" : "Pedidos aguardando"}
          </button>
        ))}
      </div>

      {tab === "pedidos" ? (
        <PedidosAguardando />
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <div className="grid grid-cols-[minmax(0,1fr)_140px_140px_140px] items-center gap-3 border-b border-white/5 px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <div>Revendedor</div>
            <div className="text-right">Saldo</div>
            <div className="text-right">Plano</div>
            <div className="text-right">Ação</div>
          </div>
          {isLoading ? (
            <div className="grid place-items-center py-16">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="grid place-items-center py-16 text-sm text-muted-foreground">
              Nenhum revendedor encontrado.
            </div>
          ) : (
            filtered.map((r) => {
              const expira = r.plano_expira_em ? new Date(r.plano_expira_em) : null;
              const vencido = expira ? expira.getTime() < Date.now() : true;
              return (
                <div
                  key={r.id}
                  className="grid grid-cols-[minmax(0,1fr)_140px_140px_140px] items-center gap-3 border-b border-white/5 px-5 py-4 last:border-b-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid size-9 place-items-center rounded-lg bg-white/5">
                      <User className="size-4 text-muted-foreground" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{r.nome || "—"}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {r.email || r.telefone || "sem contato"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1 text-sm font-semibold">
                      <Coins className="size-3.5 text-amber-300" />
                      {r.saldo_creditos ?? 0}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {expira
                      ? `${vencido ? "Vencido " : "Vence "}${expira.toLocaleDateString("pt-BR")}`
                      : "Sem plano"}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => {
                        setTarget(r);
                        setMode("remove");
                        setQtd("10");
                        setMotivo("");
                      }}
                    >
                      <Minus className="size-3.5" /> Remover
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1 gradient-primary"
                      onClick={() => {
                        setTarget(r);
                        setMode("add");
                        setQtd("10");
                        setMotivo("");
                      }}
                    >
                      <Plus className="size-3.5" /> Adicionar
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{mode === "add" ? "Adicionar créditos" : "Remover créditos"}</DialogTitle>
          </DialogHeader>
          {target && (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div className="text-xs text-muted-foreground">Revendedor</div>
                <div className="text-sm font-medium">{target.nome || target.email || "—"}</div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Coins className="size-3.5 text-amber-300" />
                  Saldo atual:{" "}
                  <strong className="text-foreground">{target.saldo_creditos ?? 0}</strong>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Quantidade</Label>
                <div className="flex flex-wrap gap-2">
                  {[10, 50, 100, 500, 1000].map((v) => (
                    <Button
                      key={v}
                      type="button"
                      size="sm"
                      variant={qtd === String(v) ? "default" : "outline"}
                      onClick={() => setQtd(String(v))}
                    >
                      {mode === "add" ? "+" : "−"}
                      {v}
                    </Button>
                  ))}
                </div>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={qtd}
                  onChange={(e) => setQtd(e.target.value)}
                  placeholder="Digite a quantidade"
                />
              </div>

              <div className="space-y-2">
                <Label>Motivo (opcional)</Label>
                <Textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ex.: bônus, correção, cortesia..."
                  rows={2}
                />
              </div>

              {movimentos.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Últimos movimentos
                  </div>
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-white/5 bg-white/[0.02] p-2">
                    {movimentos.map((m) => (
                      <div key={m.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-muted-foreground">
                          {new Date(m.created_at).toLocaleString("pt-BR")} · {m.motivo || "—"}
                        </span>
                        <span
                          className={
                            m.delta >= 0
                              ? "font-semibold text-emerald-300"
                              : "font-semibold text-rose-300"
                          }
                        >
                          {m.delta >= 0 ? "+" : ""}
                          {m.delta}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)}>
              Cancelar
            </Button>
            <Button
              className={mode === "add" ? "gradient-primary" : ""}
              variant={mode === "add" ? "default" : "destructive"}
              disabled={ajustar.isPending}
              onClick={() => ajustar.mutate()}
            >
              {ajustar.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : mode === "add" ? (
                <>
                  <Plus className="size-4" /> Adicionar
                </>
              ) : (
                <>
                  <Minus className="size-4" /> Remover
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------- Pedidos aguardando pagamento -------- */

type PedidoAguardando = {
  id: string;
  revendedor_id: string | null;
  plano_id: string | null;
  pack_id: string | null;
  valor: number;
  status: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

function PedidosAguardando() {
  const qc = useQueryClient();

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ["admin-pedidos-aguardando"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_transactions")
        .select("id,revendedor_id,plano_id,pack_id,valor,status,created_at,metadata")
        .eq("status", "aguardando_configuracao")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PedidoAguardando[];
    },
    refetchInterval: 15_000,
  });

  const liberar = useMutation({
    mutationFn: async (transacao_id: string) => {
      const { error } = await supabase.rpc("approve_pagamento", {
        _pagamento_id: transacao_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Créditos liberados");
      qc.invalidateQueries({ queryKey: ["admin-pedidos-aguardando"] });
      qc.invalidateQueries({ queryKey: ["admin-ajustar-creditos-revendedores"] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Falha ao liberar créditos");
    },
  });

  if (isLoading) {
    return (
      <div className="glass grid place-items-center rounded-2xl py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (pedidos.length === 0) {
    return (
      <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
        Nenhum pedido aguardando. Quando um cliente comprar antes do gateway ser configurado, o
        pedido aparece aqui para você liberar manualmente.
      </div>
    );
  }

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="grid grid-cols-[minmax(0,1.4fr)_140px_160px_160px] items-center gap-3 border-b border-white/5 px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        <div>Pedido</div>
        <div className="text-right">Valor</div>
        <div className="text-right">Criado</div>
        <div className="text-right">Ação</div>
      </div>
      {pedidos.map((p) => (
        <div
          key={p.id}
          className="grid grid-cols-[minmax(0,1.4fr)_140px_160px_160px] items-center gap-3 border-b border-white/5 px-5 py-4 last:border-b-0"
        >
          <div className="min-w-0">
            <div className="truncate font-mono text-xs">{p.id}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {p.plano_id ? "Plano" : p.pack_id ? "Pacote de créditos" : "—"}
              {" · Rev "}
              <span className="font-mono">{p.revendedor_id?.slice(0, 8) ?? "—"}</span>
            </div>
          </div>
          <div className="text-right text-sm font-semibold">
            {Number(p.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </div>
          <div className="text-right text-xs text-muted-foreground">
            {new Date(p.created_at).toLocaleString("pt-BR")}
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              className="gap-1 gradient-primary"
              disabled={liberar.isPending}
              onClick={() => liberar.mutate(p.id)}
            >
              {liberar.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}
              Liberar créditos
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
