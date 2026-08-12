import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  ClipboardPaste,
  MoreHorizontal,
  Plus,
  Search,
  FlaskConical,
  KeyRound,
  Hourglass,
  Loader2,
  RotateCcw,
  History,
  CalendarPlus,
  Ban,
  PlayCircle,
  Trash2,
  Send,
  MessageCircle,
  Mail,
  Pencil,
} from "lucide-react";

import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { RequireAuth } from "@/components/require-auth";

export const Route = createFileRoute("/_app/licencas")({
  head: () => ({
    meta: [
      { title: "Licenças — MR Sem Limites" },
      { name: "description", content: "Gestão de licenças no MR Sem Limites." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <LicencasPage />
    </RequireAuth>
  ),
});

type LicencaRow = {
  id: string;
  chave: string;
  cliente_id: string | null;
  email: string | null;
  status: string;
  device_id: string | null;
  expira_em: string | null;
  ativada_em: string | null;
  duracao_dias: number | null;
  trial_duracao_minutos: number | null;
  tipo: string | null;
  observacoes_admin: string | null;
  clientes?: { nome: string | null } | null;
};

type ViewStatus = "ativa" | "expirada" | "revogada" | "bloqueada";

type License = {
  id: string;
  key: string;
  client: string | null;
  email: string;
  status: ViewStatus;
  device: string | null;
  expiraEm: string | null;
  ativadaEm: string | null;
  duracaoDias: number | null;
  trialMinutos: number | null;
  tipo: string | null;
};

type Filter = "todos" | "ativas" | "expiradas" | "revogadas" | "bloqueadas";

/** Sub-abas por duração. */
type Bucket = "teste" | "1d" | "30d" | "60d" | "90d" | "1ano" | "outros";

const BUCKETS: { id: Bucket; label: string; sub: string }[] = [
  { id: "teste", label: "Teste", sub: "1 hora" },
  { id: "1d", label: "1 dia", sub: "premium" },
  { id: "30d", label: "30 dias", sub: "premium" },
  { id: "60d", label: "60 dias", sub: "premium" },
  { id: "90d", label: "90 dias", sub: "premium" },
  { id: "1ano", label: "1 ano", sub: "premium" },
];

function bucketOfRow(row: LicencaRow): Bucket {
  if ((row.tipo ?? "").toLowerCase() === "teste") return "teste";
  const dias = row.duracao_dias ?? null;
  if (dias === 1) return "1d";
  if (dias === 30) return "30d";
  if (dias === 60) return "60d";
  if (dias === 90) return "90d";
  if (dias === 365) return "1ano";
  return "outros";
}



function computeView(row: LicencaRow & { trial_duracao_minutos?: number | null }): License {
  const now = Date.now();
  const exp = row.expira_em ? new Date(row.expira_em).getTime() : null;
  let status: ViewStatus = "ativa";
  if (row.status === "revogada") status = "revogada";
  else if (row.status === "cancelada" || row.status === "bloqueada") status = "bloqueada";
  else if (exp !== null && exp < now) status = "expirada";

  return {
    id: row.id,
    key: row.chave,
    client: row.clientes?.nome ?? null,
    email: row.email ?? (row.cliente_id ? "" : "estoque"),
    status,
    device: row.device_id,
    expiraEm: row.expira_em,
    ativadaEm: row.ativada_em,
    duracaoDias: row.duracao_dias ?? null,
    trialMinutos: row.trial_duracao_minutos ?? null,
    tipo: row.tipo ?? null,
  };

}

function formatCountdown(
  expiraEmIso: string | null,
  duracaoDias: number | null,
  trialMinutos: number | null,
): { label: string; tone: "waiting" | "active" | "expired" } {
  if (!expiraEmIso) {
    if (trialMinutos && trialMinutos > 0) {
      const label =
        trialMinutos < 60
          ? `${trialMinutos} min (aguardando)`
          : trialMinutos < 60 * 24
            ? `${Math.round(trialMinutos / 60)}h (aguardando)`
            : `${Math.round(trialMinutos / (60 * 24))}d (aguardando)`;
      return { label, tone: "waiting" };
    }
    return { label: `${duracaoDias ?? 30}d (aguardando)`, tone: "waiting" };
  }
  const diff = new Date(expiraEmIso).getTime() - Date.now();
  if (diff <= 0) return { label: "expirada", tone: "expired" };
  const totalSec = Math.floor(diff / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  let label: string;
  if (d >= 2) label = `${d} dias restantes`;
  else if (d >= 1) label = `${d}d ${h}h restantes`;
  else if (h >= 1) label = `${h}h ${String(m).padStart(2, "0")}m restantes`;
  else if (m >= 1) label = `${m}m ${String(s).padStart(2, "0")}s restantes`;
  else label = `${s}s restantes`;
  return { label, tone: "active" };
}

function CountdownCell({
  expiraEm,
  duracaoDias,
  trialMinutos,
}: {
  expiraEm: string | null;
  duracaoDias: number | null;
  trialMinutos: number | null;
}) {
  const [, setT] = useState(0);
  useEffect(() => {
    if (!expiraEm) return;
    const id = setInterval(() => setT((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [expiraEm]);
  const { label, tone } = formatCountdown(expiraEm, duracaoDias, trialMinutos);
  const color =
    tone === "expired"
      ? "text-destructive"
      : tone === "waiting"
        ? "text-muted-foreground"
        : "text-foreground/85";
  return (
    <div className={cn("flex items-center gap-1.5 tabular-nums", color)}>
      <Hourglass className="size-3.5 text-primary" strokeWidth={2} />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function LicencasPage() {
  const isAdmin = useIsAdmin();
  const role = useUserRole();
  const canTeste = role === "revendedor" || role === "admin";
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [bucket, setBucket] = useState<Bucket>("teste");
  const [openNova, setOpenNova] = useState(false);
  const [openTeste, setOpenTeste] = useState(false);
  const [openEnviarTeste, setOpenEnviarTeste] = useState(false);
  const [rows, setRows] = useState<LicencaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyOf, setHistoryOf] = useState<LicencaRow | null>(null);
  const [renovarOf, setRenovarOf] = useState<LicencaRow | null>(null);
  const [editarOf, setEditarOf] = useState<LicencaRow | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkRenovarOpen, setBulkRenovarOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  async function reload() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("licencas")
      .select(
        "id, chave, cliente_id, email, status, device_id, expira_em, ativada_em, duracao_dias, trial_duracao_minutos, tipo, observacoes_admin, clientes(nome)",
      )
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as LicencaRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    reload();
    const ch = supabase
      .channel("licencas-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "licencas" }, () => reload())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const licenses = rows.map(computeView);

  // Contagem por bucket (útil pra badge nas abas)
  const bucketOfId = useMemo(() => {
    const m = new Map<string, Bucket>();
    rows.forEach((r) => m.set(r.id, bucketOfRow(r)));
    return m;
  }, [rows]);

  const bucketCounts = useMemo(() => {
    const c: Record<string, number> = { teste: 0, "1d": 0, "30d": 0, "60d": 0, "90d": 0, "1ano": 0, outros: 0 };
    bucketOfId.forEach((b) => {
      c[b] = (c[b] ?? 0) + 1;
    });
    return c;
  }, [bucketOfId]);

  const hasOutros = bucketCounts.outros > 0;

  const filtered = licenses.filter((l) => {
    const q = query.trim().toLowerCase();
    const matchQ =
      !q ||
      l.key.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      (l.client ?? "").toLowerCase().includes(q);
    const matchF =
      filter === "todos" ||
      (filter === "ativas" && l.status === "ativa") ||
      (filter === "expiradas" && l.status === "expirada") ||
      (filter === "revogadas" && l.status === "revogada") ||
      (filter === "bloqueadas" && l.status === "bloqueada");
    const matchB = bucketOfId.get(l.id) === bucket;
    return matchQ && matchF && matchB;
  });

  const available = licenses.filter((l) => l.status === "ativa" && !l.client).length;
  const total = licenses.length;

  async function resetDevice(id: string) {
    const { error } = await (supabase as any).rpc("resetar_device_licenca", {
      _licenca_id: id,
    });
    if (error) return toast.error(error.message);
    toast.success("Dispositivo liberado");

    reload();
  }

  async function cancelar(id: string) {
    if (!confirm("Cancelar esta licença?")) return;
    const { error } = await (supabase as any).rpc("cancelar_licenca", {
      _licenca_id: id,
      _motivo: "cancelada pelo usuário",
    });
    if (error) return toast.error(error.message);
    toast.success("Licença cancelada");
    reload();
  }

  async function reativar(id: string) {
    const { error } = await (supabase as any).rpc("reativar_licenca", {
      _licenca_id: id,
    });
    if (error) return toast.error(error.message);
    toast.success("Licença reativada");
    reload();
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function bulkExcluir() {
    if (selected.size === 0) return;
    if (!confirm(`Excluir ${selected.size} licença(s) selecionada(s)? Esta ação não pode ser desfeita.`)) return;
    setBulkBusy(true);
    const ids = Array.from(selected);
    const { error } = await (supabase as any).from("licencas").delete().in("id", ids);
    setBulkBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} licença(s) excluída(s)`);
    setSelected(new Set());
    reload();
  }

  async function excluirUma(id: string) {
    if (!confirm("Excluir esta licença? Esta ação não pode ser desfeita.")) return;
    const { error } = await (supabase as any).from("licencas").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Licença excluída");
    reload();
  }




  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] gradient-text-warm">
            Gestão
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">Licenças</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Gerencie as licenças criadas por você
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm">
            <KeyRound className="size-3.5 text-primary" strokeWidth={2} />
            {isAdmin ? (
              <>
                <span className="font-semibold text-primary text-lg leading-none">♾️</span>
                <span className="font-semibold text-primary">ilimitadas</span>
                <span className="text-muted-foreground">/ {total} criadas</span>
              </>
            ) : (
              <>
                <span className="font-semibold text-primary">{available} disponíveis</span>
                <span className="text-muted-foreground">/ {total} total</span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canTeste && (
            <Button
              variant="ghost"
              className="rounded-full border border-amber-400/40 bg-amber-500/10 px-4 text-amber-200 backdrop-blur-xl hover:bg-amber-500/20"
              onClick={() => setOpenEnviarTeste(true)}
              title="Criar e enviar licença teste (1 hora) para o cliente"
            >
              <Send className="size-4" strokeWidth={2} />
              Licença Teste
            </Button>
          )}
          <Button
            variant="ghost"
            className="rounded-full border border-border/70 bg-surface/50 px-4 backdrop-blur-xl hover:bg-white/5"
            onClick={() => setOpenTeste(true)}
          >
            <FlaskConical className="size-4" strokeWidth={2} />
            Vincular a Cliente
          </Button>
          <Button
            className="rounded-full gradient-primary text-primary-foreground shadow-[0_0_24px_-4px_color-mix(in_oklab,var(--primary)_70%,transparent)] hover:opacity-95"
            onClick={() => setOpenNova(true)}
          >
            <Plus className="size-4" strokeWidth={2.5} />
            Nova Licença
          </Button>
        </div>
      </header>

      {/* Sub-abas por duração */}
      <div className="glass flex flex-wrap items-center gap-1.5 rounded-full p-1.5">
        {BUCKETS.map((b) => {
          const active = bucket === b.id;
          const count = bucketCounts[b.id] ?? 0;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setBucket(b.id)}
              className={cn(
                "group flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
                active
                  ? "gradient-primary text-primary-foreground shadow-[0_0_18px_-4px_color-mix(in_oklab,var(--primary)_65%,transparent)]"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              <span>{b.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  active ? "bg-white/20 text-white" : "bg-white/[0.06] text-muted-foreground",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
        {hasOutros && (
          <button
            type="button"
            onClick={() => setBucket("outros")}
            className={cn(
              "group flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
              bucket === "outros"
                ? "gradient-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
            )}
            title="Licenças legadas com durações diferentes das padrões"
          >
            <span>Outros</span>
            <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
              {bucketCounts.outros}
            </span>
          </button>
        )}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col gap-3 md:flex-row">
        <label className="glass relative flex h-12 flex-1 items-center rounded-2xl pl-11 pr-4">
          <Search
            className="absolute left-4 size-4 text-muted-foreground"
            strokeWidth={2}
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por chave, email ou cliente..."

            className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
          />
        </label>

        <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <SelectTrigger className="glass h-12 rounded-2xl md:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativas">Ativas</SelectItem>
            <SelectItem value="expiradas">Expiradas</SelectItem>
            <SelectItem value="revogadas">Revogadas</SelectItem>
            <SelectItem value="bloqueadas">Bloqueadas (anti-tamper)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="glass-strong flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/40 px-4 py-3">
          <span className="text-sm">
            <span className="font-semibold text-primary">{selected.size}</span>{" "}
            {selected.size === 1 ? "licença selecionada" : "licenças selecionadas"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
              className="rounded-full hover:bg-white/5"
            >
              Limpar seleção
            </Button>
            <Button
              size="sm"
              onClick={() => setBulkRenovarOpen(true)}
              disabled={bulkBusy}
              className="rounded-full gradient-primary text-primary-foreground"
            >
              <CalendarPlus className="size-4" strokeWidth={2} />
              Renovar {selected.size}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={bulkExcluir}
              disabled={bulkBusy}
              className="rounded-full"
            >
              {bulkBusy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" strokeWidth={2} />}
              Excluir {selected.size}
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass overflow-hidden rounded-2xl">
        <div className="grid grid-cols-[36px_minmax(220px,1.4fr)_1fr_1fr_120px_1fr_1fr_auto] gap-4 border-b border-border/60 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <div className="flex items-center">
            <Checkbox
              checked={filtered.length > 0 && filtered.every((l) => selected.has(l.id))}
              onCheckedChange={(v) => {
                setSelected((prev) => {
                  const next = new Set(prev);
                  if (v) filtered.forEach((l) => next.add(l.id));
                  else filtered.forEach((l) => next.delete(l.id));
                  return next;
                });
              }}
              aria-label="Selecionar todas"
            />
          </div>
          <div>Chave</div>
          <div>Cliente</div>
          <div>Email</div>
          <div>Status</div>
          <div>Device</div>
          <div>Expira</div>
          <div className="text-right pr-1">Ações</div>
        </div>


        {loading ? (
          <div className="flex items-center justify-center px-6 py-14 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-muted-foreground">
            Nenhuma licença encontrada.
          </div>
        ) : (
          <ul>
            {filtered.map((l) => (
              <li
                key={l.id}
                className="grid grid-cols-[36px_minmax(220px,1.4fr)_1fr_1fr_120px_1fr_1fr_auto] items-center gap-4 border-b border-border/40 px-6 py-4 text-sm transition-colors last:border-0 hover:bg-white/[0.03]"
              >
                <div className="flex items-center">
                  <Checkbox
                    checked={selected.has(l.id)}
                    onCheckedChange={(v) => toggleOne(l.id, !!v)}
                    aria-label={`Selecionar ${l.key}`}
                  />
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="font-mono text-[13px] tracking-tight text-foreground truncate cursor-pointer select-all"
                    style={{ userSelect: "all" }}
                    onClick={(e) => {
                      const range = document.createRange();
                      range.selectNodeContents(e.currentTarget);
                      const sel = window.getSelection();
                      sel?.removeAllRanges();
                      sel?.addRange(range);
                    }}
                    title="Clique para selecionar"
                  >
                    {l.key}
                  </span>
                  <button
                    type="button"
                    aria-label="Copiar chave"
                    onClick={() => {
                      navigator.clipboard?.writeText(l.key);
                      toast.success("Chave copiada");
                    }}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                  >
                    <Copy className="size-3.5" strokeWidth={2} />
                  </button>
                </div>
                <div className="text-muted-foreground truncate">{l.client ?? "—"}</div>
                <div className="truncate text-foreground/85">{l.email}</div>
                <div>
                  <StatusPill status={l.status} />
                </div>
                <div className="text-muted-foreground">
                  {l.device ? (
                    <button
                      type="button"
                      onClick={() => resetDevice(l.id)}
                      title="Resetar dispositivo"
                      className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-white/5 hover:text-foreground"
                    >
                      <RotateCcw className="size-3" strokeWidth={2} />
                      <span className="truncate max-w-[120px]">{l.device}</span>
                    </button>
                  ) : (
                    "—"
                  )}
                </div>
                <CountdownCell
                  expiraEm={l.expiraEm}
                  duracaoDias={l.duracaoDias}
                  trialMinutos={l.trialMinutos}
                />

                {/* Ações rápidas: Reset • Copiar • Excluir */}
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    aria-label="Resetar dispositivo"
                    title="Resetar dispositivo"
                    onClick={() => resetDevice(l.id)}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                  >
                    <RotateCcw className="size-4" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    aria-label="Copiar chave"
                    title="Copiar chave"
                    onClick={() => {
                      navigator.clipboard?.writeText(l.key);
                      toast.success("Chave copiada");
                    }}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                  >
                    <Copy className="size-4" strokeWidth={2} />
                  </button>
                  {l.status === "revogada" || l.status === "bloqueada" ? (
                    <button
                      type="button"
                      aria-label="Desbloquear licença"
                      title="Desbloquear licença"
                      onClick={() => reativar(l.id)}
                      className="rounded-md p-1.5 text-emerald-400 transition-colors hover:bg-emerald-500/15"
                    >
                      <PlayCircle className="size-4" strokeWidth={2} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      aria-label="Bloquear licença"
                      title="Bloquear licença"
                      onClick={() => cancelar(l.id)}
                      className="rounded-md p-1.5 text-amber-400 transition-colors hover:bg-amber-500/15"
                    >
                      <Ban className="size-4" strokeWidth={2} />
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Editar licença"
                    title="Editar chave, cliente e observações"
                    onClick={() => setEditarOf(rows.find((r) => r.id === l.id) ?? null)}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                  >
                    <Pencil className="size-4" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    aria-label="Excluir licença"
                    title="Excluir licença"
                    onClick={() => excluirUma(l.id)}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                  >
                    <Trash2 className="size-4" strokeWidth={2} />
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="Mais opções"
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                      >
                        <MoreHorizontal className="size-4" strokeWidth={2} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass-strong">
                      <DropdownMenuItem
                        onClick={() => setHistoryOf(rows.find((r) => r.id === l.id) ?? null)}
                      >
                        <History className="size-4" /> Histórico
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setRenovarOf(rows.find((r) => r.id === l.id) ?? null)}
                      >
                        <CalendarPlus className="size-4" /> Renovar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setEditarOf(rows.find((r) => r.id === l.id) ?? null)}
                      >
                        <Pencil className="size-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {l.status === "revogada" || l.status === "bloqueada" ? (
                        <DropdownMenuItem onClick={() => reativar(l.id)}>
                          <PlayCircle className="size-4" /> Reativar
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => cancelar(l.id)}
                        >
                          <Ban className="size-4" /> Cancelar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

              </li>
            ))}
          </ul>
        )}
      </div>

      <NovaLicencaModal open={openNova} onOpenChange={setOpenNova} onSaved={reload} />
      <ChaveTesteModal open={openTeste} onOpenChange={setOpenTeste} onSaved={reload} />
      <EnviarTesteModal
        open={openEnviarTeste}
        onOpenChange={setOpenEnviarTeste}
        onSaved={reload}
      />

      <HistoricoLicencaSheet licenca={historyOf} onOpenChange={(v) => !v && setHistoryOf(null)} />
      <RenovarLicencaModal
        licenca={renovarOf}
        onOpenChange={(v) => !v && setRenovarOf(null)}
        onSaved={reload}
      />
      <EditarLicencaModal
        licenca={editarOf}
        onOpenChange={(v) => !v && setEditarOf(null)}
        onSaved={reload}
      />
      <BulkRenovarModal
        open={bulkRenovarOpen}
        ids={Array.from(selected)}
        onOpenChange={setBulkRenovarOpen}
        onDone={() => {
          setSelected(new Set());
          reload();
        }}
      />
    </div>
  );
}

function StatusPill({ status }: { status: License["status"] }) {
  const map: Record<License["status"], { label: string; color: string; bg: string; text: string }> =
    {
      ativa: {
        label: "ATIVA",
        color: "var(--brand-emerald)",
        bg: "color-mix(in oklab, var(--brand-emerald) 20%, transparent)",
        text: "oklch(0.88 0.14 165)",
      },
      expirada: {
        label: "EXPIRADA",
        color: "var(--brand-orange)",
        bg: "color-mix(in oklab, var(--brand-orange) 20%, transparent)",
        text: "oklch(0.9 0.16 60)",
      },
      revogada: {
        label: "REVOGADA",
        color: "var(--destructive)",
        bg: "color-mix(in oklab, var(--destructive) 22%, transparent)",
        text: "oklch(0.88 0.16 25)",
      },
      bloqueada: {
        label: "BLOQUEADA",
        color: "var(--destructive)",
        bg: "color-mix(in oklab, var(--destructive) 28%, transparent)",
        text: "oklch(0.9 0.18 25)",
      },
    };
  const s = map[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
      style={{
        background: s.bg,
        color: s.text,
        border: `1px solid color-mix(in oklab, ${s.color} 45%, transparent)`,
      }}
    >
      {s.label}
    </span>
  );
}

type PresetKind = "teste" | "premium";
type Preset = { label: string; kind: PresetKind; dias?: number; minutos?: number };

const LICENSE_PRESETS: Preset[] = [
  { label: "Teste 1 hora", kind: "teste", minutos: 60 },
  { label: "Teste 1 dia", kind: "teste", minutos: 60 * 24 },
  { label: "Teste 2 dias", kind: "teste", minutos: 60 * 24 * 2 },
  { label: "Teste 3 dias", kind: "teste", minutos: 60 * 24 * 3 },
  { label: "Premium 1 dia", kind: "premium", dias: 1 },
  { label: "Premium 30 dias", kind: "premium", dias: 30 },
  { label: "Premium 60 dias", kind: "premium", dias: 60 },
  { label: "Premium 90 dias", kind: "premium", dias: 90 },
  { label: "Premium 1 ano", kind: "premium", dias: 365 },
];


function NovaLicencaModal({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const isAdmin = useIsAdmin();
  const presets = isAdmin
    ? LICENSE_PRESETS
    : LICENSE_PRESETS.filter((p) => p.kind === "teste" && p.minutos === 60);

  const [quantidade, setQuantidade] = useState(1);
  const [presetIdx, setPresetIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const preset = presets[presetIdx] ?? presets[0];
  const maxQtd = isAdmin ? 500 : 1;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      // 1) Gera as chaves no estoque
      const { data: created, error } = await (supabase as any).rpc("gerar_licencas", {
        _quantidade: quantidade,
        _duracao_dias: preset.dias ?? 1,
        _revendedor_id: null,
      });
      if (error) throw error;

      // 2) Aplica tipo / trial_duracao_minutos nas chaves recém-criadas
      const ids = (created ?? []).map((r: any) => r.id).filter(Boolean);
      if (ids.length > 0) {
        const patch: Record<string, unknown> = { tipo: preset.kind };
        if (preset.kind === "teste") {
          patch.trial_duracao_minutos = preset.minutos ?? 60;
          patch.duracao_dias = null;
        } else if ((preset.dias ?? 0) === 0 && preset.minutos) {
          // Premium curto (ex.: 1 hora) → armazena minutos em trial_duracao_minutos
          patch.trial_duracao_minutos = preset.minutos;
          patch.duracao_dias = null;
        } else {
          patch.trial_duracao_minutos = null;
          patch.duracao_dias = preset.dias ?? 30;
        }
        const { error: upErr } = await (supabase as any)
          .from("licencas")
          .update(patch)
          .in("id", ids);
        if (upErr) throw upErr;
      }


      toast.success(`${quantidade} chave(s) ${preset.label} geradas`);
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao gerar chaves");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Nova Licença</DialogTitle>
          <DialogDescription>
            Escolha o tempo de validade. O tempo definido aqui aparece direto na extensão do cliente.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit}>
          <Field label="Tipo / Duração">
            <div className="grid grid-cols-2 gap-2">
              {presets.map((p, i) => {
                const active = presetIdx === i;
                const isTeste = p.kind === "teste";
                return (
                  <button
                    type="button"
                    key={p.label}
                    onClick={() => setPresetIdx(i)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all",
                      active
                        ? isTeste
                          ? "border-amber-400/70 bg-amber-500/10 text-amber-200 shadow-[0_0_18px_-4px_rgba(251,191,36,0.55)]"
                          : "border-fuchsia-400/70 bg-fuchsia-500/10 text-fuchsia-200 shadow-[0_0_18px_-4px_rgba(217,70,239,0.55)]"
                        : "border-border/60 bg-surface/40 text-muted-foreground hover:bg-white/5 hover:text-foreground",
                    )}
                  >
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] opacity-70">
                      {isTeste ? "TESTE" : "PREMIUM"}
                    </span>
                    <span className="block text-sm">
                      {isTeste
                        ? p.minutos! < 60
                          ? `${p.minutos} minutos`
                          : p.minutos === 60
                            ? "1 hora"
                            : `${Math.round((p.minutos ?? 0) / (60 * 24))} dia${
                                (p.minutos ?? 0) / (60 * 24) > 1 ? "s" : ""
                              }`
                        : (p.dias ?? 0) === 0 && p.minutos
                          ? p.minutos === 60
                            ? "1 hora"
                            : `${p.minutos} minutos`
                          : p.dias! >= 365
                            ? "1 ano"
                            : `${p.dias} dias`}
                    </span>

                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Quantidade">
            <Input
              type="number"
              min={1}
              max={maxQtd}
              value={quantidade}
              onChange={(e) =>
                setQuantidade(Math.min(maxQtd, Math.max(1, parseInt(e.target.value) || 1)))
              }
              disabled={!isAdmin}
              autoFocus
            />
            {!isAdmin && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Revendedores podem gerar apenas 1 chave de teste de 20 minutos por vez.
              </p>
            )}
          </Field>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={busy}
              className="gradient-primary text-primary-foreground"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Gerar chaves"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


function ChaveTesteModal({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [chave, setChave] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function pasteKey() {
    try {
      const text = await navigator.clipboard.readText();
      setChave(text.trim());
    } catch {
      toast.error("Não foi possível colar");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!chave.trim() || !email.trim() || !nome.trim()) {
      toast.error("Preencha nome, e-mail e chave");
      return;
    }
    setBusy(true);
    try {
      // 1. Cria cliente (consome crédito) — se o revendedor não tiver, admin pode inserir direto
      const { data: cli, error: cliErr } = await (supabase as any)
        .from("clientes")
        .insert({ nome, email })
        .select("id")
        .single();
      if (cliErr) throw cliErr;

      // 2. Atribui a chave
      const { error: linkErr } = await (supabase as any).rpc("atribuir_licenca_cliente", {
        _chave: chave.trim(),
        _cliente_id: cli.id,
        _email: email.trim(),
      });
      if (linkErr) throw linkErr;

      toast.success("Licença vinculada ao cliente");
      setChave("");
      setNome("");
      setEmail("");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao salvar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Vincular Chave ao Cliente</DialogTitle>
          <DialogDescription>Cole uma chave do estoque e vincule ao cliente.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit}>
          <Field label="Chave">
            <div className="flex items-center gap-2">
              <Input
                value={chave}
                onChange={(e) => setChave(e.target.value)}
                placeholder="XXXXX-XXXXX-XXXXX-XXXXX"

                className="font-mono"
              />
              <button
                type="button"
                aria-label="Colar chave"
                onClick={pasteKey}
                className="grid size-9 place-items-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              >
                <ClipboardPaste className="size-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                aria-label="Copiar chave"
                onClick={() => {
                  if (chave) {
                    navigator.clipboard?.writeText(chave);
                    toast.success("Chave copiada");
                  }
                }}
                className="grid size-9 place-items-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              >
                <Copy className="size-4" strokeWidth={2} />
              </button>
            </div>
          </Field>
          <Field label="Nome do cliente">
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: João Silva"
            />
          </Field>
          <Field label="Email do cliente">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@exemplo.com"
            />
          </Field>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={busy}
              className="gradient-primary text-primary-foreground"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Vincular"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label
        className={cn(
          "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
        )}
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

type EventoRow = {
  id: string;
  tipo: string;
  mensagem: string | null;
  device_id: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

function HistoricoLicencaSheet({
  licenca,
  onOpenChange,
}: {
  licenca: LicencaRow | null;
  onOpenChange: (v: boolean) => void;
}) {
  const [events, setEvents] = useState<EventoRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!licenca) return;
    setLoading(true);
    (supabase as any)
      .from("licencas_eventos")
      .select("id, tipo, mensagem, device_id, created_at, metadata")
      .eq("licenca_id", licenca.id)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }: { data: EventoRow[] | null }) => {
        setEvents(data ?? []);
        setLoading(false);
      });
  }, [licenca]);

  return (
    <Sheet open={!!licenca} onOpenChange={onOpenChange}>
      <SheetContent className="glass-strong w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Histórico da licença</SheetTitle>
          <SheetDescription className="font-mono text-xs">{licenca?.chave}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 max-h-[calc(100vh-8rem)] overflow-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" /> Carregando...
            </div>
          ) : events.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhum evento registrado.
            </p>
          ) : (
            <ul className="space-y-3">
              {events.map((e) => (
                <li key={e.id} className="rounded-xl border border-border/50 bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                      {e.tipo}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(e.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  {e.mensagem ? (
                    <p className="mt-1 text-sm text-foreground/85">{e.mensagem}</p>
                  ) : null}
                  {e.device_id ? (
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      device: {e.device_id}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function RenovarLicencaModal({
  licenca,
  onOpenChange,
  onSaved,
}: {
  licenca: LicencaRow | null;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [dias, setDias] = useState(30);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (licenca) setDias(licenca.duracao_dias ?? 30);
  }, [licenca]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!licenca) return;
    setBusy(true);
    const { error } = await (supabase as any).rpc("renovar_licenca", {
      _licenca_id: licenca.id,
      _dias: dias,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Licença renovada por ${dias} dias`);
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={!!licenca} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Renovar licença</DialogTitle>
          <DialogDescription className="font-mono text-xs">{licenca?.chave}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Dias a adicionar">
            <Input
              type="number"
              min={1}
              value={dias}
              onChange={(e) => setDias(parseInt(e.target.value) || 1)}
              autoFocus
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={busy}
              className="gradient-primary text-primary-foreground"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Renovar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BulkRenovarModal({
  open,
  ids,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  ids: string[];
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [dias, setDias] = useState(30);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (ids.length === 0) return;
    setBusy(true);
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      const { error } = await (supabase as any).rpc("renovar_licenca", {
        _licenca_id: id,
        _dias: dias,
      });
      if (error) fail++;
      else ok++;
    }
    setBusy(false);
    if (ok > 0) toast.success(`${ok} licença(s) renovada(s) por ${dias} dias`);
    if (fail > 0) toast.error(`${fail} falha(s) ao renovar`);
    onOpenChange(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Renovar {ids.length} licença(s)</DialogTitle>
          <DialogDescription>
            Adiciona os dias informados a todas as licenças selecionadas.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Dias a adicionar">
            <Input
              type="number"
              min={1}
              value={dias}
              onChange={(e) => setDias(parseInt(e.target.value) || 1)}
              autoFocus
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={busy || ids.length === 0}
              className="gradient-primary text-primary-foreground"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : `Renovar ${ids.length}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Modal “Licença Teste” — cria uma licença de 1 hora, vincula a um cliente
 * final por e-mail e permite disparar mensagem por WhatsApp / e-mail com
 * texto editável. Limite de 2 testes por e-mail de cliente.
 */
function EnviarTesteModal({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [chaveGerada, setChaveGerada] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setNome("");
      setEmail("");
      setWhatsapp("");
      setMsg("");
      setChaveGerada(null);
    }
  }, [open]);

  const defaultMsg = (chave: string) =>
    `Olá${nome ? `, ${nome}` : ""}! 👋\n\nSua licença de teste (1 hora) para o MR Sem Limites está pronta:\n\n🔑 Chave: ${chave}\n📧 E-mail: ${email}\n\nApós ativar, ela expira em 60 minutos. Aproveite!`;

  async function gerarEEnviar() {
    const em = email.trim().toLowerCase();
    if (!em || !em.includes("@")) {
      toast.error("Informe um e-mail válido do cliente.");
      return;
    }
    setBusy(true);
    try {
      // Limite anti-abuso: máx 2 testes por e-mail
      const { count, error: cErr } = await (supabase as any)
        .from("licencas")
        .select("id", { count: "exact", head: true })
        .eq("tipo", "teste")
        .ilike("email", em);
      if (cErr) throw cErr;
      if ((count ?? 0) >= 2) {
        throw new Error(
          "Este cliente já utilizou o limite de 2 licenças teste. Ofereça uma licença Premium.",
        );
      }

      // 1) Gera 1 chave (fica com duração_dias default; ajustamos abaixo)
      const { data: created, error } = await (supabase as any).rpc("gerar_licencas", {
        _quantidade: 1,
        _duracao_dias: 1,
        _revendedor_id: null,
      });
      if (error) throw error;
      const novaId = created?.[0]?.id as string | undefined;
      const novaChave = created?.[0]?.chave as string | undefined;
      if (!novaId || !novaChave) throw new Error("Falha ao gerar chave.");

      // 2) Marca como teste 1h
      const { error: upErr } = await (supabase as any)
        .from("licencas")
        .update({
          tipo: "teste",
          trial_duracao_minutos: 60,
          duracao_dias: null,
          email: em,
        })
        .eq("id", novaId);
      if (upErr) throw upErr;

      setChaveGerada(novaChave);
      setMsg((prev) => (prev.trim() ? prev : defaultMsg(novaChave)));
      toast.success("Licença teste criada.");
      onSaved();
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao gerar licença teste.");
    } finally {
      setBusy(false);
    }
  }

  function abrirWhatsApp() {
    const digits = whatsapp.replace(/\D/g, "");
    if (!digits) {
      toast.error("Informe o WhatsApp do cliente (com DDD).");
      return;
    }
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function abrirEmail() {
    if (!email.trim()) {
      toast.error("Informe o e-mail do cliente.");
      return;
    }
    const subject = "Sua licença de teste — MR Sem Limites";
    const url = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(msg)}`;
    window.location.href = url;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar Licença Teste (1 hora)</DialogTitle>
          <DialogDescription>
            Gera uma licença de teste vinculada ao e-mail do cliente e prepara o envio por WhatsApp
            ou e-mail. Limite de 2 testes por cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="Nome do cliente (opcional)">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: João" />
          </Field>
          <Field label="E-mail do cliente">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@email.com"
              disabled={!!chaveGerada}
            />
          </Field>
          <Field label="WhatsApp (com DDD)">
            <Input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="Ex.: 11999998888"
            />
          </Field>

          {!chaveGerada ? (
            <Button
              type="button"
              onClick={gerarEEnviar}
              disabled={busy}
              className="w-full gradient-primary text-primary-foreground"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Gerar chave de teste"}
            </Button>
          ) : (
            <>
              <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-300">
                  Chave gerada
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="font-mono text-amber-100">{chaveGerada}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(chaveGerada);
                      toast.success("Chave copiada");
                    }}
                    className="rounded-md p-1 text-amber-200 hover:bg-white/5"
                    aria-label="Copiar chave"
                  >
                    <Copy className="size-4" />
                  </button>
                </div>
              </div>

              <Field label="Mensagem (editável)">
                <textarea
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-border/60 bg-surface/40 p-3 text-sm outline-none focus:border-primary/60"
                />
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  onClick={abrirWhatsApp}
                  className="rounded-full bg-emerald-500/90 text-white hover:bg-emerald-500"
                >
                  <MessageCircle className="size-4" strokeWidth={2} />
                  WhatsApp
                </Button>
                <Button
                  type="button"
                  onClick={abrirEmail}
                  variant="ghost"
                  className="rounded-full border border-border/70 bg-surface/40"
                >
                  <Mail className="size-4" strokeWidth={2} />
                  E-mail
                </Button>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Modal de edição de licença: permite alterar a chave (com validação de
 * unicidade), o cliente vinculado (nome + e-mail) e observações internas.
 * Aplicável a qualquer duração (teste, 1d, 30d, 60d, 90d, 1 ano).
 */
function EditarLicencaModal({
  licenca,
  onOpenChange,
  onSaved,
}: {
  licenca: LicencaRow | null;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [chave, setChave] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (licenca) {
      setChave(licenca.chave ?? "");
      setNome(licenca.clientes?.nome ?? "");
      setEmail(licenca.email ?? "");
      setObservacoes(licenca.observacoes_admin ?? "");
    }
  }, [licenca]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!licenca) return;
    const novaChave = chave.trim();
    if (!novaChave) {
      toast.error("A chave não pode ficar vazia.");
      return;
    }
    setBusy(true);
    try {
      // 1) Atualiza a licença (chave, email, observações)
      const patch: Record<string, unknown> = {
        chave: novaChave,
        email: email.trim() ? email.trim().toLowerCase() : null,
        observacoes_admin: observacoes.trim() || null,
      };
      const { error: upErr } = await (supabase as any)
        .from("licencas")
        .update(patch)
        .eq("id", licenca.id);
      if (upErr) throw upErr;

      // 2) Atualiza nome do cliente vinculado (se houver)
      if (licenca.cliente_id && nome.trim()) {
        const { error: cliErr } = await (supabase as any)
          .from("clientes")
          .update({ nome: nome.trim() })
          .eq("id", licenca.cliente_id);
        if (cliErr) throw cliErr;
      }

      toast.success("Licença atualizada");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      const msg = String(err?.message ?? "Falha ao salvar");
      toast.error(
        msg.includes("duplicate") || msg.includes("unique")
          ? "Essa chave já existe. Escolha outra."
          : msg,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!licenca} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar licença</DialogTitle>
          <DialogDescription>
            Altere a chave, o cliente vinculado e adicione observações internas.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit}>
          <Field label="Chave">
            <Input
              value={chave}
              onChange={(e) => setChave(e.target.value.toUpperCase())}
              className="font-mono"
              placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
              autoFocus
            />
          </Field>
          <Field label="Nome do cliente">
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: João Silva"
              disabled={!licenca?.cliente_id}
            />
            {!licenca?.cliente_id && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Sem cliente vinculado. Use “Vincular a Cliente” para conectar.
              </p>
            )}
          </Field>
          <Field label="E-mail">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@email.com"
            />
          </Field>
          <Field label="Observações (interno)">
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={4}
              placeholder="Anotações internas sobre esta licença (não visível ao cliente)"
            />
          </Field>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={busy}
              className="gradient-primary text-primary-foreground"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
