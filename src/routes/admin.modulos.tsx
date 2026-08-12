import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Star, Loader2, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useModules, type SystemModule } from "@/lib/admin/use-modules";
import { ModuleIcon } from "@/components/admin/module-icon";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createFileRoute("/admin/modulos")({
  component: ModulosPage,
});

const CATEGORIAS = [
  "Todas",
  "Administração",
  "Loja",
  "Financeiro",
  "Marketing",
  "IA",
  "Conteúdo",
  "Segurança",
  "Sistema",
  "Uploads",
  "Configurações",
  "Outros",
] as const;

function ModulosPage() {
  const { modules, isLoading, refetch } = useModules();
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<(typeof CATEGORIAS)[number]>("Todas");
  const [statusFilter, setStatusFilter] = useState<"todos" | "ativos" | "inativos">("todos");

  const patch = useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: Partial<SystemModule> }) => {
      const { error } = await (supabase as any)
        .from("system_modules")
        .update(changes)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["system_modules"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao salvar"),
  });

  const reorder = useMutation({
    mutationFn: async (items: { id: string; ordem: number }[]) => {
      // Update em lote (sequencial p/ manter RLS simples)
      for (const it of items) {
        const { error } = await (supabase as any)
          .from("system_modules")
          .update({ ordem: it.ordem })
          .eq("id", it.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system_modules"] });
      toast.success("Ordem salva");
    },
  });

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return modules.filter((m) => {
      if (categoria !== "Todas" && m.categoria !== categoria) return false;
      if (statusFilter === "ativos" && !m.ativo) return false;
      if (statusFilter === "inativos" && m.ativo) return false;
      if (!q) return true;
      return (
        m.nome.toLowerCase().includes(q) ||
        m.slug.toLowerCase().includes(q) ||
        m.categoria.toLowerCase().includes(q) ||
        (m.descricao ?? "").toLowerCase().includes(q)
      );
    });
  }, [modules, busca, categoria, statusFilter]);

  const ativos = modules.filter((m) => m.ativo).length;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = filtered.findIndex((m) => m.id === active.id);
    const newIndex = filtered.findIndex((m) => m.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(filtered, oldIndex, newIndex);
    // Recalcula ordens em torno da faixa afetada
    const updates = next.map((m, i) => ({ id: m.id, ordem: i * 10 }));
    reorder.mutate(updates);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="space-y-1">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Admin</div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          <span className="gradient-text-warm">Módulos</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "Carregando módulos…"
            : `${ativos} de ${modules.length} módulos ativos. Ative, desative, reordene e favorite sem afetar dados.`}
        </p>
      </header>

      <div className="glass flex flex-wrap items-center gap-2 rounded-2xl p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar módulo…"
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm outline-none focus:border-white/20"
          />
        </div>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as (typeof CATEGORIAS)[number])}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
        >
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
        >
          <option value="todos">Todos</option>
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
        </select>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          Atualizar
        </Button>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={filtered.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {filtered.map((m) => (
                <ModuleRow
                  key={m.id}
                  module={m}
                  onPatch={(changes) => patch.mutate({ id: m.id, changes })}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
          Nenhum módulo corresponde aos filtros.
        </div>
      )}
    </div>
  );
}

function ModuleRow({
  module: m,
  onPatch,
}: {
  module: SystemModule;
  onPatch: (changes: Partial<SystemModule>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: m.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="glass group flex items-start gap-3 rounded-2xl p-4 transition-all"
    >
      <button
        type="button"
        className="mt-1 touch-none text-muted-foreground/60 hover:text-foreground"
        {...attributes}
        {...listeners}
        aria-label="Arrastar"
      >
        <GripVertical className="size-4" />
      </button>

      <span
        className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/5"
        style={m.cor ? { background: `color-mix(in oklab, ${m.cor} 25%, transparent)` } : undefined}
      >
        <ModuleIcon name={m.icone} className="size-5 text-foreground/80" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate font-medium">{m.nome}</div>
          <button
            type="button"
            onClick={() => onPatch({ favorito: !m.favorito })}
            className="text-yellow-400/60 hover:text-yellow-400"
            aria-label="Favorito"
          >
            <Star className={`size-4 ${m.favorito ? "fill-yellow-400 text-yellow-400" : ""}`} />
          </button>
        </div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {m.categoria}
          {m.rota ? <span className="ml-2 opacity-60">{m.rota}</span> : null}
        </div>
        {m.descricao && (
          <div className="mt-1 text-xs text-muted-foreground/80 line-clamp-2">{m.descricao}</div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
          <label className="flex items-center gap-1.5">
            <Switch
              checked={m.mostrar_sidebar}
              onCheckedChange={(v) => onPatch({ mostrar_sidebar: v })}
            />
            Menu
          </label>
          <label className="flex items-center gap-1.5">
            <Switch
              checked={m.mostrar_home}
              onCheckedChange={(v) => onPatch({ mostrar_home: v })}
            />
            Home
          </label>
          <label className="flex items-center gap-1.5">
            <Switch
              checked={m.mostrar_dashboard}
              onCheckedChange={(v) => onPatch({ mostrar_dashboard: v })}
            />
            Dashboard
          </label>
          <label className="flex items-center gap-1.5">
            <Switch
              checked={m.mostrar_busca}
              onCheckedChange={(v) => onPatch({ mostrar_busca: v })}
            />
            Busca
          </label>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <Switch
          checked={m.ativo}
          onCheckedChange={(v) => onPatch({ ativo: v })}
          aria-label="Ativo"
        />
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
            m.ativo
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-white/5 text-muted-foreground"
          }`}
        >
          {m.ativo ? "Ativo" : "Off"}
        </span>
      </div>
    </div>
  );
}
