import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Eye,
  Loader2,
  Monitor,
  Plus,
  Save,
  Smartphone,
  Tablet,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { ProdutoGalleryEditor } from "@/components/admin/produto-gallery-editor";
import { ProdutoModal, type Produto } from "@/components/home/home-sections";

export const Route = createFileRoute("/admin/loja-produtos")({
  component: ProdutosGaleriaPage,
});

type ProdutoRow = Produto & {
  ordem: number | null;
  ativo: boolean | null;
  created_at?: string;
};

const emptyForm = (): ProdutoRow => ({
  id: "",
  nome: "",
  titulo: null,
  descricao: null,
  categoria: null,
  preco: null,
  imagem_url: null,
  imagens: [],
  estoque: null,
  status: "disponivel",
  botao_texto: null,
  link: null,
  ordem: 0,
  ativo: true,
});

type Device = "desktop" | "tablet" | "mobile";
const DEVICE_WIDTH: Record<Device, number> = { desktop: 1120, tablet: 820, mobile: 390 };

function ProdutosGaleriaPage() {
  const [items, setItems] = useState<ProdutoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<ProdutoRow>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [device, setDevice] = useState<Device>("desktop");
  const [previewOpen, setPreviewOpen] = useState(false);

  async function reload() {
    setLoading(true);
    const { data, error } = await supabase
      .from("produtos")
      .select("*")
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data ?? []) as ProdutoRow[]);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setForm(emptyForm());
      return;
    }
    const found = items.find((p) => p.id === selectedId);
    if (found) setForm({ ...found, imagens: found.imagens ?? [] });
  }, [selectedId, items]);

  const gallery = useMemo(() => {
    const arr = [form.imagem_url, ...((form.imagens ?? []) as string[])]
      .filter((x): x is string => !!x && x.trim().length > 0)
      .map((x) => x.trim());
    return Array.from(new Set(arr));
  }, [form.imagem_url, form.imagens]);

  function setGallery(next: string[]) {
    const clean = Array.from(new Set(next.filter(Boolean)));
    setForm((f) => ({
      ...f,
      imagem_url: clean[0] ?? null,
      imagens: clean.slice(1),
    }));
  }

  async function save() {
    if (!form.nome?.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setSaving(true);
    const payload = {
      nome: form.nome,
      titulo: form.titulo,
      descricao: form.descricao,
      categoria: form.categoria,
      preco: form.preco,
      imagem_url: gallery[0] ?? null,
      imagens: gallery.slice(1),
      estoque: form.estoque,
      status: form.status,
      botao_texto: form.botao_texto,
      link: form.link,
      ordem: form.ordem ?? 0,
      ativo: form.ativo ?? true,
    };
    try {
      if (selectedId) {
        const { error } = await supabase
          .from("produtos")
          .update(payload as never)
          .eq("id", selectedId);
        if (error) throw error;
        toast.success("Produto atualizado");
      } else {
        const { data, error } = await supabase
          .from("produtos")
          .insert(payload as never)
          .select("id")
          .single();
        if (error) throw error;
        toast.success("Produto criado");
        setSelectedId(data!.id);
      }
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!selectedId) return;
    if (!confirm("Excluir este produto?")) return;
    const { error } = await supabase.from("produtos").delete().eq("id", selectedId);
    if (error) return toast.error(error.message);
    toast.success("Produto excluído");
    setSelectedId(null);
    await reload();
  }

  const previewProduto: Produto = {
    id: form.id || "preview",
    nome: form.nome || "Produto",
    titulo: form.titulo,
    descricao: form.descricao,
    categoria: form.categoria,
    preco: form.preco,
    imagem_url: gallery[0] ?? null,
    imagens: gallery.slice(1),
    estoque: form.estoque,
    status: form.status,
    botao_texto: form.botao_texto,
    link: form.link,
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Loja · Editor Premium
          </div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            <span className="gradient-text-warm">Produtos & Galeria</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload múltiplo · WebP · capa · reordenar · preview igual à loja.
          </p>
        </div>
        <Link
          to="/admin/loja"
          className="glass inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium hover:bg-white/5"
        >
          <ArrowLeft className="size-4" /> Voltar
        </Link>
      </header>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Lista */}
        <aside className="glass max-h-[80vh] overflow-y-auto rounded-2xl p-3">
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className={`mb-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              !selectedId ? "bg-primary text-primary-foreground" : "hover:bg-white/5"
            }`}
          >
            <Plus className="size-4" /> Novo produto
          </button>
          {loading ? (
            <div className="grid place-items-center py-10">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ul className="space-y-1">
              {items.map((p) => {
                const cover = p.imagem_url ?? (p.imagens ?? [])[0];
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition ${
                        selectedId === p.id ? "bg-white/10" : "hover:bg-white/5"
                      }`}
                    >
                      <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-black">
                        {cover ? (
                          <img
                            src={cover}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-[10px] text-muted-foreground">sem foto</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{p.nome}</div>
                        <div className="truncate text-[10px] text-muted-foreground">
                          {p.categoria ?? "—"} ·{" "}
                          {(p.imagens?.length ?? 0) + (p.imagem_url ? 1 : 0)} img
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
              {items.length === 0 && (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                  Nenhum produto cadastrado.
                </p>
              )}
            </ul>
          )}
        </aside>

        {/* Form */}
        <section className="space-y-4">
          <div className="glass grid gap-3 rounded-2xl p-4 sm:grid-cols-2">
            <Field label="Nome *">
              <input
                className="input"
                value={form.nome ?? ""}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </Field>
            <Field label="Título de exibição">
              <input
                className="input"
                value={form.titulo ?? ""}
                onChange={(e) => setForm({ ...form, titulo: e.target.value || null })}
              />
            </Field>
            <Field label="Categoria">
              <input
                className="input"
                value={form.categoria ?? ""}
                onChange={(e) => setForm({ ...form, categoria: e.target.value || null })}
              />
            </Field>
            <Field label="Preço (R$)">
              <input
                type="number"
                step="0.01"
                className="input"
                value={form.preco ?? ""}
                onChange={(e) =>
                  setForm({ ...form, preco: e.target.value ? Number(e.target.value) : null })
                }
              />
            </Field>
            <Field label="Descrição" full>
              <textarea
                rows={3}
                className="input"
                value={form.descricao ?? ""}
                onChange={(e) => setForm({ ...form, descricao: e.target.value || null })}
              />
            </Field>
            <Field label="Estoque">
              <input
                type="number"
                className="input"
                value={form.estoque ?? ""}
                onChange={(e) =>
                  setForm({ ...form, estoque: e.target.value ? Number(e.target.value) : null })
                }
              />
            </Field>
            <Field label="Status">
              <select
                className="input"
                value={form.status ?? "disponivel"}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="disponivel">Disponível</option>
                <option value="esgotado">Esgotado</option>
                <option value="em_breve">Em breve</option>
                <option value="arquivado">Arquivado</option>
              </select>
            </Field>
            <Field label="Texto do botão">
              <input
                className="input"
                value={form.botao_texto ?? ""}
                onChange={(e) => setForm({ ...form, botao_texto: e.target.value || null })}
              />
            </Field>
            <Field label="Link">
              <input
                className="input"
                value={form.link ?? ""}
                onChange={(e) => setForm({ ...form, link: e.target.value || null })}
              />
            </Field>
            <Field label="Ordem">
              <input
                type="number"
                className="input"
                value={form.ordem ?? 0}
                onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })}
              />
            </Field>
            <Field label="Ativo">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.ativo ?? true}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                />
                Visível na loja
              </label>
            </Field>
          </div>

          <ProdutoGalleryEditor value={gallery} onChange={setGallery} />

          {/* Preview responsivo */}
          <div className="glass rounded-2xl p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1 rounded-xl bg-black/40 p-1">
                {(["desktop", "tablet", "mobile"] as const).map((d) => {
                  const Icon = d === "desktop" ? Monitor : d === "tablet" ? Tablet : Smartphone;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDevice(d)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                        device === d ? "bg-white text-black" : "text-muted-foreground hover:text-white"
                      }`}
                    >
                      <Icon className="size-3.5" /> {d}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold transition hover:bg-white/20"
              >
                <Eye className="size-4" /> Visualizar Produto
              </button>
            </div>
            <div className="mx-auto overflow-hidden rounded-xl border border-white/10 bg-black/40">
              <div
                className="mx-auto"
                style={{ maxWidth: DEVICE_WIDTH[device], width: "100%" }}
              >
                <CardPreview p={previewProduto} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {selectedId && (
              <button
                type="button"
                onClick={remove}
                className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10"
              >
                <Trash2 className="size-4" /> Excluir
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Salvar
            </button>
          </div>
        </section>
      </div>

      {previewOpen && (
        <ProdutoModal
          produto={previewProduto}
          onClose={() => setPreviewOpen(false)}
          onBuy={() => toast.info("Preview — botão desativado no admin")}
        />
      )}
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function CardPreview({ p }: { p: Produto }) {
  const cover = p.imagem_url ?? (p.imagens ?? [])[0] ?? null;
  const brl = (n: number | null | undefined) =>
    n == null ? "" : Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
      <div className="glass flex flex-col overflow-hidden rounded-2xl">
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-black">
          {cover ? (
            <>
              <img
                src={cover}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl"
              />
              <img
                src={cover}
                alt={p.titulo ?? p.nome}
                className="relative z-10 h-full w-full object-contain"
              />
            </>
          ) : (
            <div className="grid h-full place-items-center text-xs text-muted-foreground">
              Sem imagem
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 p-4">
          {p.categoria && (
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {p.categoria}
            </span>
          )}
          <h3 className="text-sm font-semibold">{p.titulo || p.nome}</h3>
          {p.descricao && (
            <p className="line-clamp-2 text-xs text-muted-foreground/90">{p.descricao}</p>
          )}
          <div className="mt-2 flex items-end justify-between gap-2">
            <span className="text-lg font-bold">{brl(p.preco)}</span>
            <span className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              Ver detalhes
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
