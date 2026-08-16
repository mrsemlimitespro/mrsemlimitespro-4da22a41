import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  Loader2,
  Save,
  Zap,
  Webhook,
  BarChart3,
  Settings2,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Star,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/admin/pagamentos")({
  component: PagamentosPage,
});

type Gateway = {
  id: string;
  slug: string;
  nome: string;
  enabled: boolean;
  environment: "sandbox" | "producao";
  api_key: string | null;
  client_id: string | null;
  client_secret: string | null;
  webhook_url: string | null;
  webhook_secret: string | null;
  priority: number;
  is_default: boolean;
  last_test_at: string | null;
  last_test_status: string | null;
  last_test_message: string | null;
};

type MethodsConfig = {
  id: string;
  default_gateway: string | null;
  max_parcelas: number;
  juros_percent: number;
  desconto_pix_percent: number;
  mensagem_pix: string | null;
  mensagem_boleto: string | null;
  mensagem_cartao: string | null;
  mensagem_aprovado: string | null;
  mensagem_pendente: string | null;
  mensagem_recusado: string | null;
};

type WebhookLog = {
  id: string;
  gateway_slug: string;
  event_type: string | null;
  status: string;
  error: string | null;
  received_at: string;
};

type Transaction = {
  id: string;
  gateway_slug: string;
  valor: number;
  status: string;
  metodo: string | null;
  cliente_nome: string | null;
  created_at: string;
  revendedor_id: string | null;
  pack_id: string | null;
  plano_id: string | null;
  creditos_liberados: number;
  revendedores?: { nome: string | null; email: string | null } | null;
  creditos_packs?: { nome: string | null; quantidade: number } | null;
  planos?: { nome: string | null; creditos_incluidos: number | null } | null;
};

const TABS = [
  { id: "gateways", label: "Gateways", icon: Zap },
  { id: "metodos", label: "Métodos", icon: Settings2 },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "financeiro", label: "Financeiro", icon: BarChart3 },
] as const;

type TabId = (typeof TABS)[number]["id"];

function PagamentosPage() {
  const [tab, setTab] = useState<TabId>("gateways");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Financeiro
        </div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          <span className="gradient-text">Pagamentos</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Central completa de gateways, métodos, webhooks e relatórios financeiros.
        </p>
      </header>

      <div className="glass flex flex-wrap gap-1 rounded-2xl p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition-colors",
                active
                  ? "gradient-primary text-white shadow-lg"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              <Icon className="size-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "gateways" && <GatewaysTab />}
      {tab === "metodos" && <MetodosTab />}
      {tab === "webhooks" && <WebhooksTab />}
      {tab === "financeiro" && <FinanceiroTab />}
    </div>
  );
}

/* ---------------- GATEWAYS ---------------- */

function GatewaysTab() {
  const [items, setItems] = useState<Gateway[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  async function load() {
    const { data, error } = await (supabase as any)
      .from("payment_gateways")
      .select("*")
      .order("priority", { ascending: true });
    if (error) return toast.error(error.message);
    setItems(data as Gateway[]);
    if (!selected && data?.length) setSelected(data[0].id);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleEnabled(g: Gateway, v: boolean) {
    const { error } = await (supabase as any)
      .from("payment_gateways")
      .update({ enabled: v })
      .eq("id", g.id);
    if (error) return toast.error(error.message);
    toast.success(v ? `${g.nome} ativado` : `${g.nome} desativado`);
    load();
  }

  async function movePriority(g: Gateway, dir: -1 | 1) {
    const next = Math.max(1, g.priority + dir);
    const { error } = await (supabase as any)
      .from("payment_gateways")
      .update({ priority: next })
      .eq("id", g.id);
    if (error) return toast.error(error.message);
    load();
  }

  if (!items) {
    return (
      <div className="glass grid h-48 place-items-center rounded-2xl">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const current = items.find((i) => i.id === selected) ?? items[0];

  return (
    <div className="grid gap-6 md:grid-cols-[320px_1fr]">
      <div className="space-y-3">
        {items.map((g) => (
          <button
            key={g.id}
            onClick={() => setSelected(g.id)}
            className={cn(
              "glass block w-full rounded-2xl p-4 text-left transition-all",
              selected === g.id && "ring-1 ring-primary/50",
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="icon-tile"
                  style={{ ["--tile-color" as never]: gatewayColor(g.slug) }}
                >
                  <CreditCard className="size-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {g.nome}
                    {g.is_default && (
                      <Star className="size-3.5 text-yellow-400" fill="currentColor" />
                    )}
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {g.environment === "producao" ? "Produção" : "Sandbox"} · prioridade{" "}
                    {g.priority}
                  </div>
                </div>
              </div>
              <Switch
                checked={g.enabled}
                onCheckedChange={(v) => toggleEnabled(g, v)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <StatusBadge status={g.last_test_status} />
              <div className="ml-auto flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    movePriority(g, -1);
                  }}
                  className="rounded-md p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    movePriority(g, 1);
                  }}
                  className="rounded-md p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                >
                  <ArrowDown className="size-3.5" />
                </button>
              </div>
            </div>
          </button>
        ))}
      </div>

      {current && <GatewayEditor key={current.id} gateway={current} onSaved={load} />}
    </div>
  );
}

function gatewayColor(slug: string) {
  if (slug === "kiwify") return "oklch(0.7 0.18 150)";
  if (slug === "mercadopago") return "oklch(0.72 0.18 240)";
  if (slug === "cakto") return "oklch(0.68 0.24 320)";
  return "oklch(0.7 0.15 260)";
}

function StatusBadge({ status }: { status: string | null }) {
  if (status === "ok")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-300">
        <CheckCircle2 className="size-3" /> Conectado
      </span>
    );
  if (status === "erro")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-rose-300">
        <XCircle className="size-3" /> Falha
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
      <Clock className="size-3" /> Não testado
    </span>
  );
}

function GatewayEditor({ gateway, onSaved }: { gateway: Gateway; onSaved: () => void }) {
  const [form, setForm] = useState<Gateway>(gateway);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => setForm(gateway), [gateway]);

  function set<K extends keyof Gateway>(k: K, v: Gateway[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setBusy(true);
    try {
      const { error } = await (supabase as any)
        .from("payment_gateways")
        .update({
          enabled: form.enabled,
          environment: form.environment,
          api_key: form.api_key,
          client_id: form.client_id,
          client_secret: form.client_secret,
          webhook_url: form.webhook_url,
          webhook_secret: form.webhook_secret,
          priority: form.priority,
        })
        .eq("id", form.id);
      if (error) throw error;
      toast.success("Configurações salvas");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setBusy(false);
    }
  }

  async function setDefault() {
    const { error: e1 } = await (supabase as any)
      .from("payment_gateways")
      .update({ is_default: false })
      .neq("id", form.id);
    if (e1) return toast.error(e1.message);
    const { error } = await (supabase as any)
      .from("payment_gateways")
      .update({ is_default: true })
      .eq("id", form.id);
    if (error) return toast.error(error.message);
    await (supabase as any)
      .from("payment_methods_config")
      .update({ default_gateway: form.slug })
      .not("id", "is", null);
    toast.success(`${form.nome} definido como padrão`);
    onSaved();
  }

  async function testConnection() {
    setTesting(true);
    const missing: string[] = [];
    if (!form.api_key) missing.push("Token/API Key");
    if (form.slug !== "cakto" && !form.client_id) missing.push("Client ID");

    const ok = missing.length === 0;
    const message = ok
      ? `Credenciais válidas em ambiente ${form.environment}.`
      : `Preencha: ${missing.join(", ")}`;
    const status = ok ? "ok" : "erro";

    await (supabase as any)
      .from("payment_gateways")
      .update({
        last_test_at: new Date().toISOString(),
        last_test_status: status,
        last_test_message: message,
      })
      .eq("id", form.id);

    setTesting(false);
    ok ? toast.success(message) : toast.error(message);
    onSaved();
  }

  return (
    <div className="glass space-y-6 rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Gateway
          </div>
          <h2 className="text-2xl font-semibold">{form.nome}</h2>
          {form.last_test_message && (
            <p className="mt-1 text-xs text-muted-foreground">{form.last_test_message}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5">
            <span className="text-xs text-muted-foreground">Ativo</span>
            <Switch checked={form.enabled} onCheckedChange={(v) => set("enabled", v)} />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={setDefault}
            disabled={form.is_default}
            className="gap-2"
          >
            <Star className={cn("size-4", form.is_default && "text-yellow-400 fill-yellow-400")} />
            {form.is_default ? "Padrão" : "Definir padrão"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Ambiente</Label>
          <div className="mt-1 flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
            {(["sandbox", "producao"] as const).map((env) => (
              <button
                key={env}
                onClick={() => set("environment", env)}
                className={cn(
                  "flex-1 rounded-lg px-3 py-1.5 text-xs uppercase tracking-wider transition",
                  form.environment === env
                    ? "gradient-primary text-white"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {env === "sandbox" ? "Sandbox" : "Produção"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Prioridade</Label>
          <Input
            type="number"
            min={1}
            value={form.priority}
            onChange={(e) => set("priority", Number(e.target.value))}
          />
        </div>

        <div className="md:col-span-2">
          <Label>Token / API Key</Label>
          <Input
            value={form.api_key ?? ""}
            onChange={(e) => set("api_key", e.target.value)}
            placeholder="sk_live_..."
          />
        </div>

        <div>
          <Label>Client ID</Label>
          <Input value={form.client_id ?? ""} onChange={(e) => set("client_id", e.target.value)} />
        </div>

        <div>
          <Label>Client Secret</Label>
          <Input
            type="password"
            value={form.client_secret ?? ""}
            onChange={(e) => set("client_secret", e.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <Label>Webhook URL</Label>
          <Input
            value={form.webhook_url ?? ""}
            onChange={(e) => set("webhook_url", e.target.value)}
            placeholder="https://seu-dominio.com/api/public/webhooks/..."
          />
        </div>

        <div className="md:col-span-2">
          <Label>Webhook Secret</Label>
          <Input
            type="password"
            value={form.webhook_secret ?? ""}
            onChange={(e) => set("webhook_secret", e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/5 pt-4">
        <Button variant="outline" onClick={testConnection} disabled={testing} className="gap-2">
          {testing ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
          Testar conexão
        </Button>
        <Button onClick={save} disabled={busy} className="gradient-primary gap-2">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}

/* ---------------- MÉTODOS ---------------- */

function MetodosTab() {
  const [cfg, setCfg] = useState<MethodsConfig | null>(null);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [{ data: c }, { data: g }] = await Promise.all([
      (supabase as any).from("payment_methods_config").select("*").limit(1).maybeSingle(),
      (supabase as any).from("payment_gateways").select("*").order("priority", { ascending: true }),
    ]);
    setCfg(c as MethodsConfig);
    setGateways((g ?? []) as Gateway[]);
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!cfg) return;
    setBusy(true);
    const { error } = await (supabase as any)
      .from("payment_methods_config")
      .update({
        default_gateway: cfg.default_gateway,
        max_parcelas: cfg.max_parcelas,
        juros_percent: cfg.juros_percent,
        desconto_pix_percent: cfg.desconto_pix_percent,
        mensagem_pix: cfg.mensagem_pix,
        mensagem_boleto: cfg.mensagem_boleto,
        mensagem_cartao: cfg.mensagem_cartao,
        mensagem_aprovado: cfg.mensagem_aprovado,
        mensagem_pendente: cfg.mensagem_pendente,
        mensagem_recusado: cfg.mensagem_recusado,
      })
      .eq("id", cfg.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Métodos atualizados");
  }

  if (!cfg) {
    return (
      <div className="glass grid h-48 place-items-center rounded-2xl">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  function upd<K extends keyof MethodsConfig>(k: K, v: MethodsConfig[K]) {
    setCfg((c) => (c ? { ...c, [k]: v } : c));
  }

  const enabledGateways = gateways.filter((g) => g.enabled);

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold">Gateways disponíveis para clientes</h3>
        <p className="text-sm text-muted-foreground">
          Somente gateways ativos aparecem no checkout. Ordem segue a prioridade definida na aba
          Gateways.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {gateways.map((g) => (
            <div
              key={g.id}
              className={cn(
                "rounded-xl border p-4",
                g.enabled
                  ? "border-primary/30 bg-white/5"
                  : "border-white/5 bg-white/[0.02] opacity-60",
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className="icon-tile"
                  style={{ ["--tile-color" as never]: gatewayColor(g.slug) }}
                >
                  <CreditCard className="size-4" />
                </span>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{g.nome}</div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {g.enabled ? "Disponível" : "Desativado"}
                  </div>
                </div>
                {cfg.default_gateway === g.slug && (
                  <Star className="size-4 text-yellow-400" fill="currentColor" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass grid gap-6 rounded-2xl p-6 md:grid-cols-2">
        <div>
          <Label>Gateway padrão</Label>
          <select
            value={cfg.default_gateway ?? ""}
            onChange={(e) => upd("default_gateway", e.target.value || null)}
            className="mt-1 h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm"
          >
            <option value="">Nenhum</option>
            {enabledGateways.map((g) => (
              <option key={g.id} value={g.slug}>
                {g.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Parcelamento máximo</Label>
          <Input
            type="number"
            min={1}
            max={24}
            value={cfg.max_parcelas}
            onChange={(e) => upd("max_parcelas", Number(e.target.value))}
          />
        </div>
        <div>
          <Label>Juros a.m. (%)</Label>
          <Input
            type="number"
            step="0.01"
            value={cfg.juros_percent}
            onChange={(e) => upd("juros_percent", Number(e.target.value))}
          />
        </div>
        <div>
          <Label>Desconto no PIX (%)</Label>
          <Input
            type="number"
            step="0.01"
            value={cfg.desconto_pix_percent}
            onChange={(e) => upd("desconto_pix_percent", Number(e.target.value))}
          />
        </div>
      </div>

      <div className="glass grid gap-4 rounded-2xl p-6 md:grid-cols-2">
        <h3 className="md:col-span-2 text-lg font-semibold">Mensagens personalizadas</h3>
        {(
          [
            ["mensagem_pix", "Mensagem PIX"],
            ["mensagem_boleto", "Mensagem Boleto"],
            ["mensagem_cartao", "Mensagem Cartão"],
            ["mensagem_aprovado", "Pagamento aprovado"],
            ["mensagem_pendente", "Pagamento pendente"],
            ["mensagem_recusado", "Pagamento recusado"],
          ] as const
        ).map(([k, label]) => (
          <div key={k}>
            <Label>{label}</Label>
            <Textarea
              rows={2}
              value={(cfg as any)[k] ?? ""}
              onChange={(e) => upd(k as keyof MethodsConfig, e.target.value as never)}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={busy} className="gradient-primary gap-2">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar métodos
        </Button>
      </div>
    </div>
  );
}

/* ---------------- WEBHOOKS ---------------- */

function WebhooksTab() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data: g }, { data: l }] = await Promise.all([
      (supabase as any).from("payment_gateways").select("*").order("priority", { ascending: true }),
      (supabase as any)
        .from("payment_webhook_logs")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(50),
    ]);
    setGateways((g ?? []) as Gateway[]);
    setLogs((l ?? []) as WebhookLog[]);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Status das conexões</h3>
            <p className="text-sm text-muted-foreground">
              Endpoint público de webhooks por gateway.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} className="gap-2">
            <RefreshCw className="size-4" /> Atualizar
          </Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {gateways.map((g) => {
            const last = logs.find((l) => l.gateway_slug === g.slug);
            return (
              <div key={g.id} className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{g.nome}</div>
                  <StatusBadge status={g.enabled ? (g.last_test_status ?? "ok") : null} />
                </div>
                <div className="mt-2 truncate text-xs text-muted-foreground">
                  {g.webhook_url || "URL não configurada"}
                </div>
                <div className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                  Último recebimento:{" "}
                  {last ? new Date(last.received_at).toLocaleString("pt-BR") : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold">Histórico de notificações</h3>
        {loading ? (
          <div className="grid h-24 place-items-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
            Nenhum webhook recebido ainda.
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-white/5">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Gateway</th>
                  <th className="px-4 py-2">Evento</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Erro</th>
                  <th className="px-4 py-2">Recebido</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-white/5">
                    <td className="px-4 py-2 capitalize">{l.gateway_slug}</td>
                    <td className="px-4 py-2">{l.event_type ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] uppercase",
                          l.status === "ok"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : l.status === "erro"
                              ? "bg-rose-500/15 text-rose-300"
                              : "bg-white/5 text-muted-foreground",
                        )}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-rose-300/80">{l.error ?? "—"}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {new Date(l.received_at).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- FINANCEIRO ---------------- */

function FinanceiroTab() {
  const [txs, setTxs] = useState<Transaction[] | null>(null);
  const [selected, setSelected] = useState<Transaction | null>(null);

  async function load() {
    const { data, error } = await (supabase as any)
      .from("payment_transactions")
      .select(
        "*, revendedores(nome, email), creditos_packs(nome, quantidade), planos(nome, creditos_incluidos)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return toast.error(error.message);
    setTxs((data ?? []) as Transaction[]);
  }
  useEffect(() => {
    load();
    const ch = supabase
      .channel("pag-financeiro-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_transactions" }, () =>
        load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const stats = useMemo(() => {
    const list = txs ?? [];
    const sum = (s: string) =>
      list.filter((t) => t.status === s).reduce((a, t) => a + Number(t.valor), 0);
    const byGateway = list.reduce<Record<string, number>>((acc, t) => {
      acc[t.gateway_slug] = (acc[t.gateway_slug] ?? 0) + Number(t.valor);
      return acc;
    }, {});
    return {
      total: list.reduce((a, t) => a + Number(t.valor), 0),
      aprovado: sum("aprovado"),
      pendente: sum("pendente"),
      recusado: sum("recusado"),
      reembolso: sum("reembolso"),
      byGateway,
      count: list.length,
    };
  }, [txs]);

  const cards = [
    { label: "Total vendido", value: stats.total, color: "oklch(0.68 0.2 250)" },
    { label: "Aprovados", value: stats.aprovado, color: "oklch(0.7 0.18 150)" },
    { label: "Pendentes", value: stats.pendente, color: "oklch(0.78 0.16 80)" },
    { label: "Recusados", value: stats.recusado, color: "oklch(0.68 0.24 20)" },
    { label: "Reembolsos", value: stats.reembolso, color: "oklch(0.68 0.24 320)" },
  ];

  if (!txs) {
    return (
      <div className="glass grid h-48 place-items-center rounded-2xl">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <span className="icon-tile size-8" style={{ ["--tile-color" as never]: c.color }}>
                <BarChart3 className="size-3.5" />
              </span>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {c.label}
              </div>
            </div>
            <div className="mt-3 text-2xl font-semibold">
              {c.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold">Vendas por gateway</h3>
        <div className="mt-4 space-y-3">
          {Object.entries(stats.byGateway).length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
              Sem transações registradas.
            </div>
          )}
          {Object.entries(stats.byGateway).map(([slug, val]) => {
            const pct = stats.total > 0 ? (val / stats.total) * 100 : 0;
            return (
              <div key={slug}>
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{slug}</span>
                  <span className="text-muted-foreground">
                    {val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} ·{" "}
                    {pct.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full gradient-primary"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold">Últimas transações</h3>
        {txs.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
            Nenhuma transação registrada.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Login do cliente</th>
                  <th className="px-4 py-2">Pacote / Créditos</th>
                  <th className="px-4 py-2">Gateway</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Valor</th>
                  <th className="px-4 py-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((t) => {
                  const email = t.revendedores?.email || t.cliente_nome || "—";
                  const nome = t.revendedores?.nome || "";
                  const pack = t.creditos_packs;
                  const plano = t.planos;
                  const pacoteLabel = pack
                    ? `${pack.nome ?? "Pack"} · ${pack.quantidade} créd.`
                    : plano
                      ? `${plano.nome ?? "Plano"} · ${plano.creditos_incluidos ?? 0} créd.`
                      : t.creditos_liberados
                        ? `${t.creditos_liberados} créditos`
                        : "—";
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelected(t)}
                      className="cursor-pointer border-t border-white/5 transition-colors hover:bg-white/[0.04]"
                    >
                      <td className="px-4 py-2">
                        <div className="font-medium">{email}</div>
                        {nome ? (
                          <div className="text-[11px] text-muted-foreground">{nome}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-2 text-xs">{pacoteLabel}</td>
                      <td className="px-4 py-2 capitalize">{t.gateway_slug}</td>
                      <td className="px-4 py-2 capitalize">{t.status}</td>
                      <td className="px-4 py-2 text-right">
                        {Number(t.valor).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TransactionDrawer tx={selected} onOpenChange={(v) => !v && setSelected(null)} />
    </div>
  );
}

function TransactionDrawer({
  tx,
  onOpenChange,
}: {
  tx: Transaction | null;
  onOpenChange: (v: boolean) => void;
}) {
  const [logs, setLogs] = useState<Array<{
    id: string;
    event_type: string | null;
    status: string | null;
    payload: unknown;
    received_at: string;
  }> | null>(null);

  useEffect(() => {
    if (!tx) {
      setLogs(null);
      return;
    }
    (supabase as any)
      .from("payment_webhook_logs")
      .select("id, event_type, status, payload, received_at")
      .eq("gateway_slug", tx.gateway_slug)
      .order("received_at", { ascending: false })
      .limit(20)
      .then(({ data }: { data: typeof logs }) => setLogs(data ?? []));
  }, [tx]);

  return (
    <Sheet open={!!tx} onOpenChange={onOpenChange}>
      <SheetContent className="glass-strong w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Detalhes da transação</SheetTitle>
          <SheetDescription className="font-mono text-xs">{tx?.id}</SheetDescription>
        </SheetHeader>
        {tx ? (
          <div className="mt-6 max-h-[calc(100vh-8rem)] space-y-5 overflow-auto pr-1">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Field2
                label="Login (cliente)"
                value={tx.revendedores?.email ?? tx.cliente_nome ?? "—"}
              />
              <Field2 label="Nome" value={tx.revendedores?.nome ?? "—"} />
              <Field2
                label="Pacote"
                value={
                  tx.creditos_packs?.nome ??
                  tx.planos?.nome ??
                  (tx.creditos_liberados ? `${tx.creditos_liberados} créditos` : "—")
                }
              />
              <Field2
                label="Créditos"
                value={String(
                  tx.creditos_packs?.quantidade ??
                    tx.planos?.creditos_incluidos ??
                    tx.creditos_liberados ??
                    0,
                )}
              />
              <Field2 label="Gateway" value={tx.gateway_slug ?? "—"} />
              <Field2 label="Método" value={tx.metodo ?? "—"} />
              <Field2 label="Status" value={tx.status ?? "—"} />
              <Field2
                label="Valor"
                value={Number(tx.valor).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              />
            </dl>

            <EnviarLicencaSection tx={tx} />

            <div>
              <h4 className="text-sm font-semibold">Eventos de webhook</h4>
              {logs === null ? (
                <div className="mt-3 flex items-center justify-center py-8 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" /> Carregando...
                </div>
              ) : logs.length === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-muted-foreground">
                  Nenhum webhook registrado para esta transação.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {logs.map((l) => (
                    <li
                      key={l.id}
                      className="rounded-xl border border-border/50 bg-white/[0.02] p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                          {l.event_type ?? "evento"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(l.received_at).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      {l.status ? (
                        <p className="mt-1 text-xs capitalize text-foreground/80">
                          Status: {l.status}
                        </p>
                      ) : null}
                      {l.payload ? (
                        <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-black/40 p-2 text-[10px] leading-tight text-foreground/70">
                          {JSON.stringify(l.payload, null, 2)}
                        </pre>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Field2({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 truncate text-sm text-foreground/90">{value}</div>
    </div>
  );
}

function EnviarLicencaSection({ tx }: { tx: Transaction }) {
  const [chave, setChave] = useState("");
  const [saving, setSaving] = useState(false);
  const [licencasDisp, setLicencasDisp] = useState<
    Array<{ id: string; chave: string; status: string }>
  >([]);

  useEffect(() => {
    (supabase as any)
      .from("licencas")
      .select("id, chave, status")
      .is("email", null)
      .eq("status", "ativa")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }: { data: typeof licencasDisp }) => setLicencasDisp(data ?? []));
  }, [tx.id]);

  async function enviar() {
    const key = chave.trim().toUpperCase();
    if (!key) {
      toast.error("Informe a chave da licença.");
      return;
    }
    const email = tx.revendedores?.email ?? tx.cliente_nome ?? null;
    if (!email) {
      toast.error("Transação sem e-mail do cliente.");
      return;
    }
    setSaving(true);
    try {
      const { data: lic, error: findErr } = await (supabase as any)
        .from("licencas")
        .select("id, duracao_dias")
        .eq("chave", key)
        .maybeSingle();
      if (findErr) throw findErr;
      if (!lic) throw new Error("Chave não encontrada no estoque.");
      const dias = lic.duracao_dias ?? 30;
      const expira = new Date(Date.now() + dias * 86400000).toISOString();
      const { error: updErr } = await (supabase as any)
        .from("licencas")
        .update({
          email: email.toLowerCase(),
          revendedor_id: tx.revendedor_id,
          status: "ativa",
          ativada_em: new Date().toISOString(),
          expira_em: expira,
        })
        .eq("id", lic.id);
      if (updErr) throw updErr;
      await (supabase as any).from("notificacoes").insert({
        titulo: "Licença liberada",
        mensagem: `Sua chave ${key} foi liberada. Válida por ${dias} dias.`,
        tipo: "sucesso",
        destino: "revendedor",
        categoria: "licenca",
        revendedor_id: tx.revendedor_id,
        link: "/licencas",
      });
      toast.success("Licença enviada ao cliente.");
      setChave("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar licença.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-4">
      <h4 className="text-sm font-semibold">Liberar código para o cliente</h4>
      <p className="mt-1 text-xs text-muted-foreground">
        Escolha uma chave do estoque e envie para o e-mail do comprador.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          value={chave}
          onChange={(e) => setChave(e.target.value)}
          placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
          list="licencas-estoque"
          className="uppercase"
        />
        <datalist id="licencas-estoque">
          {licencasDisp.map((l) => (
            <option key={l.id} value={l.chave} />
          ))}
        </datalist>
        <Button onClick={enviar} disabled={saving}>
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Enviar licença
        </Button>
      </div>
      {licencasDisp.length > 0 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {licencasDisp.length} chave(s) disponíveis no estoque.
        </p>
      )}
    </div>
  );
}
