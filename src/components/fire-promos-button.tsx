import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Flame, Sparkles, ChevronRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { playSfx } from "@/lib/sfx";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

type Promocao = {
  id: string;
  titulo: string;
  descricao: string | null;
  imagem_url: string | null;
  desconto_percentual: number | null;
  inicio: string | null;
  fim: string | null;
  plano_id: string | null;
  pack_id: string | null;
  link: string | null;
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Botão flutuante de fogo (canto inferior direito).
 * Ao clicar, abre um Drawer com as promoções ativas do dia.
 * Clicar numa promoção → checkout com o plano/pack já pré-selecionado.
 */
export function FirePromosButton() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [promos, setPromos] = useState<Promocao[]>([]);

  useEffect(() => {
    let alive = true;
    async function load() {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("promocoes")
        .select(
          "id,titulo,descricao,imagem_url,desconto_percentual,inicio,fim,plano_id,pack_id,link",
        )
        .eq("ativo", true)
        .or(`inicio.is.null,inicio.lte.${nowIso}`)
        .or(`fim.is.null,fim.gte.${nowIso}`)
        .order("created_at", { ascending: false });
      if (alive) setPromos((data as Promocao[]) ?? []);
    }
    load();
    // re-check a cada minuto (para expirar sozinho quando `fim` passar)
    const t = window.setInterval(load, 60_000);

    const ch = supabase
      .channel("promocoes-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "promocoes" }, () => load())
      .subscribe();

    return () => {
      alive = false;
      window.clearInterval(t);
      supabase.removeChannel(ch);
    };
  }, []);

  const badge = useMemo(() => promos.length, [promos]);

  // Toca "notification" quando surge nova promoção ativa (badge 0 → >0
  // ou aumenta enquanto o cliente está no painel).
  const prevBadgeRef = useRef(0);
  useEffect(() => {
    if (badge > prevBadgeRef.current) {
      playSfx("notification", 2000);
    }
    prevBadgeRef.current = badge;
  }, [badge]);

  // Sem promoções ativas → botão some completamente
  if (badge === 0) return null;

  function handleClick(p: Promocao) {
    setOpen(false);
    if (p.link) {
      window.open(p.link, "_blank", "noopener,noreferrer");
      return;
    }
    const params = new URLSearchParams();
    params.set("promo", p.id);
    if (p.plano_id) params.set("plano", p.plano_id);
    if (p.pack_id) params.set("pack", p.pack_id);
    navigate({ to: `/checkout?${params.toString()}` as never });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Promoções do dia"
        className="fixed bottom-24 right-5 z-40 grid size-16 place-items-center rounded-full text-white shadow-2xl transition-transform hover:scale-105 md:bottom-8 md:right-8"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, #ffd166 0%, #ff8a3d 35%, #ff2e6a 70%, #7a1c1c 100%)",
          boxShadow:
            "0 0 30px -5px color-mix(in oklab, #ff5a1f 70%, transparent), 0 12px 40px -10px rgba(0,0,0,.55), inset 0 0 20px color-mix(in oklab, #ffd166 45%, transparent)",
          animation: "fire-pulse 2.2s ease-in-out infinite",
        }}
      >
        <Flame className="size-7 drop-shadow-[0_2px_6px_rgba(0,0,0,.5)]" strokeWidth={2.2} />
        {badge > 0 && (
          <span className="absolute -top-1 -right-1 grid size-6 place-items-center rounded-full border-2 border-background bg-white text-[11px] font-bold text-[color:var(--brand-magenta)]">
            {badge}
          </span>
        )}
        <style>{`
          @keyframes fire-pulse {
            0%,100% { transform: scale(1); filter: brightness(1); }
            50%     { transform: scale(1.06); filter: brightness(1.15); }
          }
        `}</style>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto bg-background">
          <SheetHeader className="text-left">
            <div className="mb-2 flex items-center gap-3">
              <span
                className="grid size-11 place-items-center rounded-2xl text-white"
                style={{
                  background: "linear-gradient(135deg, #ff8a3d 0%, #ff2e6a 60%, #7a1c1c 100%)",
                }}
              >
                <Flame className="size-5" />
              </span>
              <div>
                <SheetTitle className="text-xl">Promoções do dia</SheetTitle>
                <SheetDescription>
                  {badge > 0
                    ? `${badge} oferta${badge > 1 ? "s" : ""} ativa${badge > 1 ? "s" : ""} agora`
                    : "Nenhuma promoção ativa no momento."}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-4 space-y-3">
            {promos.length === 0 && (
              <div className="rounded-2xl border border-border/60 bg-surface/40 p-6 text-center">
                <Sparkles className="mx-auto mb-2 size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Volte em breve — novas promoções aparecem aqui automaticamente.
                </p>
              </div>
            )}

            {promos.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleClick(p)}
                className="group flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-surface/40 p-3 text-left transition hover:border-[color:var(--brand-magenta)]/60 hover:bg-surface/70"
              >
                <div
                  className="relative size-16 shrink-0 overflow-hidden rounded-xl"
                  style={{
                    background:
                      "linear-gradient(135deg, color-mix(in oklab, var(--brand-orange) 40%, transparent), color-mix(in oklab, var(--brand-magenta) 55%, transparent))",
                  }}
                >
                  {p.imagem_url ? (
                    <img
                      src={p.imagem_url}
                      alt={p.titulo}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <Flame className="absolute inset-0 m-auto size-6 text-white/90" />
                  )}
                  {p.desconto_percentual ? (
                    <span className="absolute bottom-1 left-1 rounded-md bg-black/60 px-1.5 text-[10px] font-bold text-white">
                      -{Number(p.desconto_percentual)}%
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.titulo}</p>
                  {p.descricao && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{p.descricao}</p>
                  )}
                  {p.fim && (
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-[color:var(--brand-orange)]">
                      Até {new Date(p.fim).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
          {/* helper — silence unused warning */}
          <span className="hidden">{brl(0)}</span>
        </SheetContent>
      </Sheet>
    </>
  );
}
