import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, GripVertical, Home, ExternalLink, Eye, EyeOff } from "lucide-react";
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

export const Route = createFileRoute("/admin/home")({
  component: AdminHomePage,
});

// Seções disponíveis para a Home (slug precisa existir em system_modules)
const HOME_SLUGS = [
  "carrossel",
  "propagandas",
  "loja-produtos",
  "promocoes",
  "planos",
  "produtos",
  "videos",
];

function AdminHomePage() {
  const { modules, isLoading, refetch } = useModules();
  const queryClient = useQueryClient();

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

  const homeModules = modules
    .filter((m) => HOME_SLUGS.includes(m.slug))
    .sort((a, b) => a.ordem - b.ordem);

  const visiveis = homeModules.filter((m) => m.ativo && m.mostrar_home).length;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = homeModules.findIndex((m) => m.id === active.id);
    const newIndex = homeModules.findIndex((m) => m.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(homeModules, oldIndex, newIndex);
    const updates = next.map((m, i) => ({ id: m.id, ordem: i * 10 }));
    reorder.mutate(updates);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-1">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Admin</div>
        <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight md:text-4xl">
          <Home className="size-7 text-muted-foreground" />
          <span className="gradient-text-warm">Home</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "Carregando seções…"
            : `${visiveis} de ${homeModules.length} seções visíveis na Home. Arraste para reordenar, ative/desative e personalize títulos.`}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/">
              <ExternalLink className="mr-2 size-3.5" />
              Ver Home
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            Atualizar
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="grid place-items-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : homeModules.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
          Nenhuma seção de Home encontrada.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext
            items={homeModules.map((m) => m.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-3">
              {homeModules.map((m) => (
                <HomeSectionRow
                  key={m.id}
                  module={m}
                  onPatch={(changes) => patch.mutate({ id: m.id, changes })}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function HomeSectionRow({
  module: m,
  onPatch,
}: {
  module: SystemModule;
  onPatch: (changes: Partial<SystemModule>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: m.id,
  });
  const [titulo, setTitulo] = useState(m.titulo_home ?? "");
  const [subtitulo, setSubtitulo] = useState(m.subtitulo_home ?? "");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const visible = m.ativo && m.mostrar_home;

  return (
    <div ref={setNodeRef} style={style} className="glass rounded-2xl p-4">
      <div className="flex items-start gap-3">
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
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                visible ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-muted-foreground"
              }`}
            >
              {visible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
              {visible ? "Visível" : "Oculto"}
            </span>
          </div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {m.categoria}
            {m.rota ? (
              <Link to={m.rota} className="ml-2 opacity-70 hover:opacity-100 hover:underline">
                {m.rota}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            Ativo
            <Switch checked={m.ativo} onCheckedChange={(v) => onPatch({ ativo: v })} />
          </label>
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            Home
            <Switch
              checked={m.mostrar_home}
              onCheckedChange={(v) => onPatch({ mostrar_home: v })}
            />
          </label>
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Título na Home (opcional)
          </label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onBlur={() => {
              const val = titulo.trim() || null;
              if (val !== (m.titulo_home ?? null)) onPatch({ titulo_home: val as any });
            }}
            placeholder={m.nome}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm outline-none focus:border-white/20"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Subtítulo (opcional)
          </label>
          <input
            value={subtitulo}
            onChange={(e) => setSubtitulo(e.target.value)}
            onBlur={() => {
              const val = subtitulo.trim() || null;
              if (val !== (m.subtitulo_home ?? null)) onPatch({ subtitulo_home: val as any });
            }}
            placeholder="Descrição curta exibida abaixo do título"
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm outline-none focus:border-white/20"
          />
        </div>
      </div>
    </div>
  );
}
