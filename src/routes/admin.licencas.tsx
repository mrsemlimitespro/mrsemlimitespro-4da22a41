import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  KeyRound,
  Search,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Ban,
  Layers,
  Loader2,
  Copy,
  Pencil,
  RefreshCw,
  Send,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/licencas")({
  head: () => ({ meta: [{ title: "Licenças — Admin" }, { name: "robots", content: "noindex" }] }),
  component: LicencasAdmin,
});

// ============================================================
// Tipos & abas
// ============================================================

type Licenca = {
  id: string;
  chave: string;
  status: string;
  tipo: string;
  email: string | null;
  cliente_id: string | null;
  revendedor_id: string | null;
  produto_id: string | null;
  device_id: string | null;
  ultimo_acesso: string | null;
  ativada_em: string | null;
  expira_em: string | null;
  created_at: string;
  reset_hwid_motivo: string | null;
  reset_hwid_solicitado_em: string | null;
  observacoes_admin: string | null;
  duracao_dias: number;
  metadata: Record<string, unknown> | null;
};

type TabKey = "todas" | "teste" | "premium" | "expiradas" | "canceladas" | "bloqueadas";

const TABS: { key: TabKey; label: string; icon: typeof KeyRound; desc: string }[] = [
  { key: "todas", label: "Todas", icon: Layers, desc: "Todas as licenças" },
  { key: "teste", label: "Teste", icon: ShieldAlert, desc: "Licenças de teste ativas" },
  { key: "premium", label: "Premium", icon: ShieldCheck, desc: "Licenças Premium ativas" },
  { key: "expiradas", label: "Expiradas", icon: ShieldX, desc: "Passaram do prazo" },
  { key: "canceladas", label: "Canceladas", icon: Ban, desc: "Canceladas manualmente" },
  { key: "bloqueadas", label: "Bloqueadas", icon: Ban, desc: "Bloqueadas / revogadas" },
];

// ============================================================
// Página
// ============================================================

function LicencasAdmin() {
  const [tab, setTab] = useState<TabKey>("todas");
  const [busca, setBusca] = useState("");
  const [resetTarget, setResetTarget] = useState<Licenca | null>(null);
  const [renovTarget, setRenovTarget] = useState<Licenca | null>(null);
  const qc = useQueryClient();

  const { data: licencas = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-licencas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("licencas")
        .select(
          "id,chave,status,tipo,email,cliente_id,revendedor_id,produto_id,device_id,ultimo_acesso,ativada_em,expira_em,created_at,reset_hwid_motivo,reset_hwid_solicitado_em,observacoes_admin,duracao_dias,metadata",
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Licenca[];
    },
  });

  const contagens = useMemo(() => {
    const c: Record<TabKey, number> = {
      todas: licencas.length,
      teste: 0,
      premium: 0,
      expiradas: 0,
      canceladas: 0,
      bloqueadas: 0,
    };
    for (const l of licencas) {
      if (l.status === "expirada") c.expiradas++;
      else if (l.status === "cancelada") c.canceladas++;
      else if (l.status === "bloqueada" || l.status === "revogada") c.bloqueadas++;
      else if (l.tipo === "teste" && l.status === "ativa") c.teste++;
      else if (l.tipo === "premium" && l.status === "ativa") c.premium++;
    }
    return c;
  }, [licencas]);

  const filtradas = useMemo(() => {
    let base = licencas;
    switch (tab) {
      case "teste":
        base = base.filter((l) => l.tipo === "teste" && l.status === "ativa");
        break;
      case "premium":
        base = base.filter((l) => l.tipo === "premium" && l.status === "ativa");
        break;
      case "expiradas":
        base = base.filter((l) => l.status === "expirada");
        break;
      case "canceladas":
        base = base.filter((l) => l.status === "cancelada");
        break;
      case "bloqueadas":
        base = base.filter((l) => l.status === "bloqueada" || l.status === "revogada");
        break;
      case "todas":
      default:
        break;
    }
    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      base = base.filter(
        (l) =>
          l.chave.toLowerCase().includes(q) ||
          (l.email ?? "").toLowerCase().includes(q) ||
          (l.device_id ?? "").toLowerCase().includes(q),
      );
    }
    return base;
  }, [licencas, tab, busca]);

  // Mutations
  const resetDevice = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { error } = await (supabase as any).rpc("resetar_device_licenca", { _licenca_id: id });
      if (error) throw error;
      // grava motivo em observacoes_admin como registro simples (não altera schema base)
      await supabase
        .from("licencas")
        .update({
          reset_hwid_motivo: motivo,
          reset_hwid_solicitado_em: new Date().toISOString(),
        })
        .eq("id", id);
    },
    onSuccess: () => {
      toast.success("Dispositivo restaurado. Cliente pode ativar em outro aparelho.");
      setResetTarget(null);
      qc.invalidateQueries({ queryKey: ["admin-licencas"] });
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao restaurar dispositivo"),
  });

  const renovar = useMutation({
    mutationFn: async ({ id, dias }: { id: string; dias: number }) => {
      const { error } = await (supabase as any).rpc("renovar_licenca", { _licenca_id: id, _dias: dias });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Licença renovada.");
      setRenovTarget(null);
      qc.invalidateQueries({ queryKey: ["admin-licencas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("cancelar_licenca", {
        _licenca_id: id,
        _motivo: "Cancelada pelo admin",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Licença cancelada.");
      qc.invalidateQueries({ queryKey: ["admin-licencas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reativar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("reativar_licenca", { _licenca_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Licença reativada.");
      qc.invalidateQueries({ queryKey: ["admin-licencas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reenviar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("reenviar_licenca", { _licenca_id: id });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Email de licença enfileirado."),
    onError: (e: Error) => toast.error(e.message || "Falha ao reenviar"),
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Licenciamento</div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            <span className="gradient-text-warm">Licenças</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Master · Revenda · Cliente. Restaurar dispositivo, renovar, cancelar e reativar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-1 size-4" /> Atualizar
          </Button>
          <Button size="sm" asChild className="gradient-primary">
            <Link to="/admin/$resource" params={{ resource: "licencas" }}>
              <Pencil className="mr-1 size-4" /> Editor detalhado
            </Link>
          </Button>
        </div>
      </header>

      {/* Abas */}
      <div className="glass flex flex-wrap gap-1 rounded-2xl p-1.5">
        {TABS.map((t) => {
          const active = tab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition-all",
                active
                  ? "gradient-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5",
              )}
            >
              <Icon className="size-4" />
              {t.label}
              <span
                className={cn(
                  "min-w-6 rounded-full px-1.5 text-[10px] tabular-nums",
                  active ? "bg-white/25" : "bg-white/5",
                )}
              >
                {contagens[t.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por chave, e-mail ou device…"
          className="pl-9"
        />
      </div>

      {/* Tabela */}
      <div className="glass overflow-hidden rounded-2xl">
        {isLoading ? (
          <div className="p-10 text-center">
            <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtradas.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhuma licença encontrada nesta aba.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-white/5">
                  <th className="px-4 py-3 font-medium">Chave</th>
                  <th className="px-4 py-3 font-medium">Nível</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="px-4 py-3 font-medium">Device</th>
                  <th className="px-4 py-3 font-medium">Expira</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((l) => (
                  <LicencaRow
                    key={l.id}
                    l={l}
                    onReset={() => setResetTarget(l)}
                    onRenovar={() => setRenovTarget(l)}
                    onCancelar={() => cancelar.mutate(l.id)}
                    onReativar={() => reativar.mutate(l.id)}
                    onReenviar={() => reenviar.mutate(l.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modais */}
      <ResetDeviceDialog
        licenca={resetTarget}
        onClose={() => setResetTarget(null)}
        onConfirm={(motivo) =>
          resetTarget && resetDevice.mutate({ id: resetTarget.id, motivo })
        }
        busy={resetDevice.isPending}
      />
      <RenovarDialog
        licenca={renovTarget}
        onClose={() => setRenovTarget(null)}
        onConfirm={(dias) => renovTarget && renovar.mutate({ id: renovTarget.id, dias })}
        busy={renovar.isPending}
      />
    </div>
  );
}

// ============================================================
// Linha
// ============================================================

function LicencaRow({
  l,
  onReset,
  onRenovar,
  onCancelar,
  onReativar,
  onReenviar,
}: {
  l: Licenca;
  onReset: () => void;
  onRenovar: () => void;
  onCancelar: () => void;
  onReativar: () => void;
  onReenviar: () => void;
}) {
  const nivel = derivarNivel(l);
  const encerrada = l.status === "expirada" || l.status === "cancelada" || l.status === "bloqueada" || l.status === "revogada";

  return (
    <tr className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02]">
      <td className="px-4 py-3 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span>{l.chave}</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(l.chave);
              toast.success("Chave copiada");
            }}
            className="text-muted-foreground hover:text-foreground"
            title="Copiar"
          >
            <Copy className="size-3" />
          </button>
        </div>
      </td>
      <td className="px-4 py-3">
        <NivelBadge nivel={nivel} />
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider",
            l.tipo === "premium" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300",
          )}
        >
          {l.tipo}
        </span>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={l.status} />
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{l.email ?? "—"}</td>
      <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">
        {l.device_id ? l.device_id.slice(0, 12) + "…" : "—"}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {l.expira_em ? new Date(l.expira_em).toLocaleDateString("pt-BR") : "sem prazo"}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={onReenviar} title="Reenviar licença por email">
            <Send className="size-4 text-sky-400" />
          </Button>
          {l.device_id && (
            <Button size="sm" variant="ghost" onClick={onReset} title="Restaurar dispositivo">
              <RotateCcw className="size-4" />
            </Button>
          )}
          {!encerrada && (
            <Button size="sm" variant="ghost" onClick={onRenovar} title="Renovar">
              <RefreshCw className="size-4" />
            </Button>
          )}
          {!encerrada ? (
            <Button size="sm" variant="ghost" onClick={onCancelar} title="Cancelar">
              <Ban className="size-4 text-rose-400" />
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={onReativar} title="Reativar">
              <ShieldCheck className="size-4 text-emerald-400" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

function derivarNivel(l: Licenca): "master" | "revenda" | "cliente" {
  if (l.cliente_id) return "cliente";
  if (l.revendedor_id) return "revenda";
  return "master";
}

function NivelBadge({ nivel }: { nivel: "master" | "revenda" | "cliente" }) {
  const styles = {
    master: "bg-violet-500/15 text-violet-300",
    revenda: "bg-blue-500/15 text-blue-300",
    cliente: "bg-cyan-500/15 text-cyan-300",
  } as const;
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider", styles[nivel])}>
      {nivel}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ativa: "bg-emerald-500/15 text-emerald-300",
    expirada: "bg-amber-500/15 text-amber-300",
    cancelada: "bg-rose-500/15 text-rose-300",
    bloqueada: "bg-rose-500/15 text-rose-300",
    revogada: "bg-rose-500/15 text-rose-300",
    suspensa: "bg-orange-500/15 text-orange-300",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider",
        map[status] ?? "bg-white/10 text-foreground/80",
      )}
    >
      {status}
    </span>
  );
}

// ============================================================
// Modais
// ============================================================

function ResetDeviceDialog({
  licenca,
  onClose,
  onConfirm,
  busy,
}: {
  licenca: Licenca | null;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
  busy: boolean;
}) {
  const [motivo, setMotivo] = useState("");
  return (
    <Dialog
      open={!!licenca}
      onOpenChange={(o) => {
        if (!o) {
          setMotivo("");
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restaurar dispositivo</DialogTitle>
          <DialogDescription>
            Libera esta licença para ativar em outro aparelho (PC → notebook, celular, etc). O
            cliente precisará entrar novamente na próxima abertura da extensão.
          </DialogDescription>
        </DialogHeader>
        {licenca && (
          <div className="space-y-3">
            <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-xs">
              <div className="text-muted-foreground">Chave</div>
              <div className="font-mono">{licenca.chave}</div>
              <div className="mt-2 text-muted-foreground">Device atual</div>
              <div className="font-mono text-[10px]">{licenca.device_id ?? "—"}</div>
            </div>
            <div>
              <Label htmlFor="motivo">Motivo (obrigatório)</Label>
              <Textarea
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex: cliente trocou de notebook / formatou / novo celular"
                rows={3}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="gradient-primary"
            disabled={busy || motivo.trim().length < 3}
            onClick={() => onConfirm(motivo.trim())}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Restaurar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenovarDialog({
  licenca,
  onClose,
  onConfirm,
  busy,
}: {
  licenca: Licenca | null;
  onClose: () => void;
  onConfirm: (dias: number) => void;
  busy: boolean;
}) {
  const [dias, setDias] = useState(30);
  return (
    <Dialog
      open={!!licenca}
      onOpenChange={(o) => {
        if (!o) {
          setDias(30);
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renovar licença</DialogTitle>
          <DialogDescription>
            Estende a validade da licença. Se já estiver expirada, ela volta a ficar ativa.
          </DialogDescription>
        </DialogHeader>
        {licenca && (
          <div className="space-y-3">
            <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-xs">
              <div className="text-muted-foreground">Chave</div>
              <div className="font-mono">{licenca.chave}</div>
              <div className="mt-2 text-muted-foreground">Expira atualmente</div>
              <div>
                {licenca.expira_em
                  ? new Date(licenca.expira_em).toLocaleString("pt-BR")
                  : "sem prazo"}
              </div>
            </div>
            <div>
              <Label htmlFor="dias">Adicionar dias</Label>
              <Input
                id="dias"
                type="number"
                min={1}
                max={3650}
                value={dias}
                onChange={(e) => setDias(Math.max(1, Number(e.target.value) || 0))}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[7, 30, 90, 180, 365].map((d) => (
                  <Button
                    key={d}
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setDias(d)}
                    className="rounded-full border border-white/5"
                  >
                    +{d}d
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="gradient-primary" disabled={busy || dias < 1} onClick={() => onConfirm(dias)}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : `Adicionar +${dias}d`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
