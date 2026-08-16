/**
 * Painel administrativo de gestão de revendedores.
 *
 * Recursos:
 *  - Listagem com busca (nome, email, whatsapp, empresa, status)
 *  - Botão "Novo Revendedor" com formulário completo + envio de Magic Link
 *  - Ações por linha: Bloquear/Desbloquear, Renovar, Definir validade,
 *    Tornar Vitalício, Reenviar Magic Link, Ver clientes, Ver licenças
 *  - Zero comissão — modelo é apenas revenda de licenças
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  UserPlus,
  Send,
  Ban,
  CheckCircle2,
  Infinity as InfinityIcon,
  CalendarClock,
  Users as UsersIcon,
  KeyRound,
  X,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createRevendedorManual,
  setRevendedorBloqueio,
  setRevendedorValidade,
  resendMagicLinkRevendedor,
  resetRevendedorPassword,
  deleteRevendedor,
} from "@/lib/revendedores/admin.functions";

export const Route = createFileRoute("/admin/revendedores-gestao")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Gestão de Revendedores — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RevendedoresGestaoPage,
});

type Row = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  empresa: string | null;
  cpf_cnpj: string | null;
  status: string;
  bloqueado: boolean;
  plano_expira_em: string | null;
  saldo_creditos: number;
  created_at: string;
};

const VALIDADE_OPTIONS = [
  { label: "30 dias", dias: 30 },
  { label: "60 dias", dias: 60 },
  { label: "90 dias", dias: 90 },
  { label: "180 dias", dias: 180 },
  { label: "365 dias", dias: 365 },
  { label: "Vitalício", dias: null as number | null },
];

function fmtDate(d: string | null) {
  if (!d) return "Vitalício";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("pt-BR");
}

function RevendedoresGestaoPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<
    "todos" | "ativos" | "bloqueados" | "expirados" | "vitalicios"
  >("todos");
  const [dlgOpen, setDlgOpen] = useState(false);

  const createFn = useServerFn(createRevendedorManual);
  const blockFn = useServerFn(setRevendedorBloqueio);
  const validadeFn = useServerFn(setRevendedorValidade);
  const magicFn = useServerFn(resendMagicLinkRevendedor);
  const resetFn = useServerFn(resetRevendedorPassword);
  const deleteFn = useServerFn(deleteRevendedor);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-revendedores-gestao"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("revendedores")
        .select(
          "id,nome,email,telefone,whatsapp,empresa,cpf_cnpj,status,bloqueado,plano_expira_em,saldo_creditos,created_at,deleted_at",
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const filtered = useMemo(() => {
    const now = Date.now();
    const list = (rows ?? []).filter((r) => {
      switch (filter) {
        case "ativos":
          return !r.bloqueado &&
            (!r.plano_expira_em || new Date(r.plano_expira_em).getTime() > now);
        case "bloqueados":
          return r.bloqueado;
        case "expirados":
          return r.plano_expira_em &&
            new Date(r.plano_expira_em).getTime() <= now;
        case "vitalicios":
          return !r.plano_expira_em;
        default:
          return true;
      }
    });
    if (!q.trim()) return list;
    const s = q.toLowerCase();
    return list.filter((r) =>
      [r.nome, r.email, r.telefone, r.whatsapp, r.empresa, r.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s)),
    );
  }, [rows, q, filter]);

  const blockMut = useMutation({
    mutationFn: (v: { id: string; bloqueado: boolean }) => blockFn({ data: v }),
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["admin-revendedores-gestao"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });

  const validadeMut = useMutation({
    mutationFn: (v: {
      id: string;
      dias: number | null;
      modo: "definir" | "adicionar";
    }) => validadeFn({ data: v }),
    onSuccess: () => {
      toast.success("Validade atualizada");
      qc.invalidateQueries({ queryKey: ["admin-revendedores-gestao"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });

  const magicMut = useMutation({
    mutationFn: (id: string) => magicFn({ data: { id } }),
    onSuccess: () => toast.success("Magic Link reenviado (email enfileirado)"),
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });

  const resetMut = useMutation({
    mutationFn: (id: string) => resetFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Link de redefinição enviado por email");
      qc.invalidateQueries({ queryKey: ["admin-revendedores-gestao"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Revendedor excluído");
      qc.invalidateQueries({ queryKey: ["admin-revendedores-gestao"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Comercial
          </div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            <span className="gradient-text-warm">Gestão de Revendedores</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastro manual, bloqueio, validade e reenvio de acesso via Magic Link.
          </p>
        </div>
        <Button onClick={() => setDlgOpen(true)} className="gradient-primary">
          <UserPlus className="size-4" /> Novo Revendedor
        </Button>
      </header>

      <div className="glass rounded-2xl p-4">
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, email, WhatsApp, empresa, status…"
            className="pl-9"
          />
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {[
            { k: "todos", label: "Todos" },
            { k: "ativos", label: "Ativos" },
            { k: "bloqueados", label: "Bloqueados" },
            { k: "expirados", label: "Expirados" },
            { k: "vitalicios", label: "Vitalícios" },
          ].map((t) => (
            <button
              key={t.k}
              type="button"
              onClick={() => setFilter(t.k as typeof filter)}
              className={
                "rounded-full border px-3 py-1 text-xs " +
                (filter === t.k
                  ? "border-primary bg-primary/20 text-foreground"
                  : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10")
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
            Nenhum revendedor encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-white/5">
                  <th className="py-2 pr-3 text-left font-medium">Revendedor</th>
                  <th className="py-2 pr-3 text-left font-medium">Contato</th>
                  <th className="py-2 pr-3 text-left font-medium">Empresa</th>
                  <th className="py-2 pr-3 text-left font-medium">Status</th>
                  <th className="py-2 pr-3 text-left font-medium">Validade</th>
                  <th className="py-2 pr-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 align-top">
                    <td className="py-3 pr-3">
                      <div className="font-medium">{r.nome}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </td>
                    <td className="py-3 pr-3 text-xs">
                      {r.whatsapp || r.telefone || "—"}
                    </td>
                    <td className="py-3 pr-3 text-xs">{r.empresa || "—"}</td>
                    <td className="py-3 pr-3">
                      <span
                        className={
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] " +
                          (r.bloqueado
                            ? "bg-red-500/10 text-red-300"
                            : "bg-emerald-500/10 text-emerald-300")
                        }
                      >
                        {r.bloqueado ? "Bloqueado" : "Ativo"}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-xs">
                      <span className="inline-flex items-center gap-1">
                        {r.plano_expira_em ? (
                          <CalendarClock className="size-3" />
                        ) : (
                          <InfinityIcon className="size-3" />
                        )}
                        {fmtDate(r.plano_expira_em)}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <IconAction
                          title={r.bloqueado ? "Desbloquear" : "Bloquear"}
                          onClick={() =>
                            blockMut.mutate({ id: r.id, bloqueado: !r.bloqueado })
                          }
                        >
                          {r.bloqueado ? (
                            <CheckCircle2 className="size-3.5" />
                          ) : (
                            <Ban className="size-3.5" />
                          )}
                        </IconAction>
                        <IconAction
                          title="Renovar +30 dias"
                          onClick={() =>
                            validadeMut.mutate({
                              id: r.id,
                              dias: 30,
                              modo: "adicionar",
                            })
                          }
                        >
                          +30d
                        </IconAction>
                        <IconAction
                          title="Renovar +90 dias"
                          onClick={() =>
                            validadeMut.mutate({
                              id: r.id,
                              dias: 90,
                              modo: "adicionar",
                            })
                          }
                        >
                          +90d
                        </IconAction>
                        <IconAction
                          title="Tornar vitalício"
                          onClick={() =>
                            validadeMut.mutate({
                              id: r.id,
                              dias: null,
                              modo: "definir",
                            })
                          }
                        >
                          <InfinityIcon className="size-3.5" />
                        </IconAction>
                        <IconAction
                          title="Reenviar Magic Link"
                          onClick={() => magicMut.mutate(r.id)}
                        >
                          <Send className="size-3.5" />
                        </IconAction>
                        <IconAction
                          title="Redefinir senha (envia email)"
                          onClick={() => resetMut.mutate(r.id)}
                        >
                          <RotateCcw className="size-3.5" />
                        </IconAction>
                        <IconAction
                          title="Excluir revendedor"
                          onClick={() => {
                            if (
                              confirm(
                                `Excluir revendedor ${r.nome}? Esta ação é reversível pelo suporte.`,
                              )
                            )
                              deleteMut.mutate(r.id);
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </IconAction>
                        <a
                          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] hover:bg-white/10"
                          href={`/admin/clientes?revendedor_id=${r.id}`}
                          title="Ver clientes"
                        >
                          <UsersIcon className="size-3.5" />
                        </a>
                        <a
                          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] hover:bg-white/10"
                          href={`/admin/licencas?revendedor_id=${r.id}`}
                          title="Ver licenças"
                        >
                          <KeyRound className="size-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dlgOpen && (
        <NovoRevendedorDialog
          onClose={() => setDlgOpen(false)}
          onCreated={() => {
            setDlgOpen(false);
            qc.invalidateQueries({ queryKey: ["admin-revendedores-gestao"] });
          }}
          submit={(v) => createFn({ data: v })}
        />
      )}
    </div>
  );
}

function IconAction({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] hover:bg-white/10"
    >
      {children}
    </button>
  );
}

// ----------------------------- Dialog Novo -----------------------------
type NovoInput = Parameters<typeof createRevendedorManual>[0] extends { data: infer T }
  ? T
  : never;

function NovoRevendedorDialog({
  onClose,
  onCreated,
  submit,
}: {
  onClose: () => void;
  onCreated: () => void;
  submit: (v: NovoInput) => Promise<{ ok: boolean; magicLink: string | null }>;
}) {
  const [form, setForm] = useState({
    nome: "",
    email: "",
    whatsapp: "",
    empresa: "",
    cpf_cnpj: "",
    observacoes: "",
    status: "ativo" as "ativo" | "pendente" | "inativo",
    validade: "365" as string, // 30/60/90/180/365/vitalicio/custom
    validadeCustom: 30,
    senha_temporaria: "",
    enviarMagicLink: true,
  });
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (form.nome.trim().length < 2 || !form.email.includes("@")) {
      toast.error("Preencha nome e email válidos");
      return;
    }
    setBusy(true);
    try {
      const validade_dias =
        form.validade === "vitalicio"
          ? null
          : form.validade === "custom"
            ? Number(form.validadeCustom) || 30
            : Number(form.validade);
      const vitalicio = form.validade === "vitalicio";
      const res = await submit({
        nome: form.nome.trim(),
        email: form.email.trim().toLowerCase(),
        whatsapp: form.whatsapp || null,
        empresa: form.empresa || null,
        cpf_cnpj: form.cpf_cnpj || null,
        observacoes: form.observacoes || null,
        status: form.status,
        validade_dias,
        vitalicio,
        senha_temporaria: form.senha_temporaria.trim() || null,
        enviarMagicLink: form.enviarMagicLink && !form.senha_temporaria.trim(),
      } as NovoInput);
      toast.success(
        res.magicLink ? "Revendedor criado — Magic Link enviado" : "Revendedor criado",
      );
      onCreated();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao criar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="glass-strong max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Novo Revendedor</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-white/10"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Nome *</Label>
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>
          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <Label>WhatsApp</Label>
            <Input
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              placeholder="(11) 90000-0000"
            />
          </div>
          <div>
            <Label>Empresa</Label>
            <Input
              value={form.empresa}
              onChange={(e) => setForm({ ...form, empresa: e.target.value })}
            />
          </div>
          <div>
            <Label>CPF / CNPJ</Label>
            <Input
              value={form.cpf_cnpj}
              onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })}
            />
          </div>
          <div>
            <Label>Status</Label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as any })}
              className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm"
            >
              <option value="ativo">Ativo</option>
              <option value="pendente">Pendente</option>
              <option value="inativo">Bloqueado</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <Label>Validade do painel</Label>
            <div className="flex flex-wrap gap-2">
              {VALIDADE_OPTIONS.map((o) => {
                const val = o.dias === null ? "vitalicio" : String(o.dias);
                const active = form.validade === val;
                return (
                  <button
                    key={o.label}
                    type="button"
                    onClick={() => setForm({ ...form, validade: val })}
                    className={
                      "rounded-lg border px-3 py-1.5 text-xs " +
                      (active
                        ? "border-primary bg-primary/20 text-foreground"
                        : "border-white/10 bg-white/5 hover:bg-white/10")
                    }
                  >
                    {o.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setForm({ ...form, validade: "custom" })}
                className={
                  "rounded-lg border px-3 py-1.5 text-xs " +
                  (form.validade === "custom"
                    ? "border-primary bg-primary/20 text-foreground"
                    : "border-white/10 bg-white/5 hover:bg-white/10")
                }
              >
                Personalizado
              </button>
              {form.validade === "custom" && (
                <Input
                  type="number"
                  min={1}
                  className="w-28"
                  value={form.validadeCustom}
                  onChange={(e) =>
                    setForm({ ...form, validadeCustom: Number(e.target.value) })
                  }
                />
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <Label>Observações</Label>
            <Textarea
              rows={3}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <Label>Senha temporária (opcional)</Label>
            <Input
              type="text"
              value={form.senha_temporaria}
              onChange={(e) =>
                setForm({ ...form, senha_temporaria: e.target.value })
              }
              placeholder="Mínimo 6 caracteres — o revendedor terá que trocá-la no primeiro acesso"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Se informada, o email conterá login + senha temporária. Se em
              branco, será enviado Magic Link.
            </p>
          </div>

          <label className="md:col-span-2 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
            <input
              type="checkbox"
              checked={form.enviarMagicLink}
              onChange={(e) =>
                setForm({ ...form, enviarMagicLink: e.target.checked })
              }
              className="size-4"
            />
            <span>
              Enviar Magic Link + email de boas-vindas imediatamente
            </span>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button
            className="gradient-primary"
            onClick={handleSubmit}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <UserPlus className="size-4" /> Criar revendedor
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
