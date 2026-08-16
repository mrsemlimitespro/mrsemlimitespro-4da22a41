import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Loader2, Plus, Star, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { compressToWebp } from "@/lib/image-compress";

const BUCKET = "admin-media";
const SIGNED_TTL = 60 * 60 * 24 * 365 * 10; // 10 anos

type UploadingItem = {
  id: string;
  progress: number; // 0..100
  previewUrl: string;
};

async function uploadOne(file: File, onProgress: (p: number) => void): Promise<string> {
  onProgress(5);
  const { blob } = await compressToWebp(file);
  onProgress(35);
  const path = `produtos/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { cacheControl: "3600", upsert: false, contentType: "image/webp" });
  if (error) throw error;
  onProgress(80);
  const { data: signed, error: sErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_TTL);
  if (sErr) throw sErr;
  onProgress(100);
  return signed?.signedUrl ?? "";
}

function Thumb({
  url,
  index,
  isCover,
  onCover,
  onRemove,
}: {
  url: string;
  index: number;
  isCover: boolean;
  onCover: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: url,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative aspect-square w-24 shrink-0 overflow-hidden rounded-xl border ${
        isCover ? "border-amber-400/70 ring-2 ring-amber-400/40" : "border-white/10"
      } bg-black`}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
      >
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover"
          loading={index === 0 ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
        />
      </div>
      {isCover && (
        <span className="pointer-events-none absolute left-1 top-1 rounded-md bg-amber-400/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black">
          Capa
        </span>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between gap-1 p-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
        {!isCover && (
          <button
            type="button"
            onClick={onCover}
            title="Definir como capa"
            className="grid size-6 place-items-center rounded-md bg-black/80 text-amber-300 backdrop-blur transition hover:bg-black"
          >
            <Star className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          title="Remover"
          className="ml-auto grid size-6 place-items-center rounded-md bg-black/80 text-red-300 backdrop-blur transition hover:bg-red-500 hover:text-white"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export function ProdutoGalleryEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [uploads, setUploads] = useState<UploadingItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    return () => uploads.forEach((u) => URL.revokeObjectURL(u.previewUrl));
  }, [uploads]);

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;

    const pending: UploadingItem[] = list.map((f) => ({
      id: crypto.randomUUID(),
      progress: 0,
      previewUrl: URL.createObjectURL(f),
    }));
    setUploads((u) => [...u, ...pending]);

    const results = await Promise.all(
      list.map(async (file, i) => {
        const item = pending[i];
        try {
          const url = await uploadOne(file, (p) =>
            setUploads((u) => u.map((x) => (x.id === item.id ? { ...x, progress: p } : x))),
          );
          return url;
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Falha no upload");
          return null;
        } finally {
          setUploads((u) => u.filter((x) => x.id !== item.id));
        }
      }),
    );

    const ok = results.filter((x): x is string => !!x);
    if (ok.length) onChange([...value, ...ok]);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  }

  function move(next: string[]) {
    onChange(next);
  }

  function makeCover(url: string) {
    move([url, ...value.filter((u) => u !== url)]);
  }

  function remove(url: string) {
    move(value.filter((u) => u !== url));
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = value.indexOf(active.id as string);
    const newIdx = value.indexOf(over.id as string);
    if (oldIdx < 0 || newIdx < 0) return;
    move(arrayMove(value, oldIdx, newIdx));
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`glass flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
          dragOver ? "border-primary bg-primary/10" : "border-white/15"
        }`}
      >
        <UploadCloud className="size-8 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium">Arraste imagens ou clique para escolher</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Múltiplas · convertidas para WebP · máx 1920px · qualidade 90%
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {(value.length > 0 || uploads.length > 0) && (
        <div className="glass rounded-2xl p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Galeria ({value.length})
            </span>
            <span className="text-[10px] text-muted-foreground">
              Arraste para reordenar · ⭐ define capa
            </span>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={value} strategy={horizontalListSortingStrategy}>
              <div className="flex flex-wrap gap-2">
                {value.map((url, i) => (
                  <Thumb
                    key={url}
                    url={url}
                    index={i}
                    isCover={i === 0}
                    onCover={() => makeCover(url)}
                    onRemove={() => remove(url)}
                  />
                ))}
                {uploads.map((u) => (
                  <div
                    key={u.id}
                    className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black"
                  >
                    <img
                      src={u.previewUrl}
                      alt=""
                      className="h-full w-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 grid place-items-center">
                      <Loader2 className="size-5 animate-spin text-white" />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${u.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="grid aspect-square w-24 shrink-0 place-items-center rounded-xl border border-dashed border-white/20 text-muted-foreground transition hover:border-primary hover:text-primary"
                  title="Adicionar mais"
                >
                  <Plus className="size-6" />
                </button>
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}
