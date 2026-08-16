import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { playSfx } from "@/lib/sfx";

type Slide = {
  id: string;
  titulo: string;
  imagem_desktop_url?: string | null;
  imagem_mobile_url?: string | null;
  imagem_url?: string | null;
  link?: string | null;
  cor_fundo?: string | null;
};

/**
 * Carrossel infinito.
 * Fonte primária: tabela `carrossel_slides` (ativa, dentro do período).
 * Fallback: tabela `banners` (para retrocompatibilidade).
 * Se ambas estiverem vazias, mostra demo colorido.
 */
export function PromoCarousel() {
  const [items, setItems] = useState<Slide[]>([]);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      // 1) tenta carrossel_slides
      const { data: slides } = await supabase
        .from("carrossel_slides")
        .select("id,titulo,imagem_desktop_url,imagem_mobile_url,link,cor_fundo")
        .eq("ativo", true)
        .order("ordem", { ascending: true });

      if (slides && slides.length > 0) {
        if (alive) setItems(slides as Slide[]);
        return;
      }
      // 2) fallback banners
      const { data: banners } = await supabase
        .from("banners")
        .select("id,titulo,imagem_url,link,cor_fundo")
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      if (alive) setItems((banners as Slide[]) ?? []);
    };

    load();

    const ch = supabase
      .channel("carrossel-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "carrossel_slides" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "banners" }, load)
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, []);

  // Fallback demo colorido quando não há nada cadastrado
  const demo: Slide[] = [
    { id: "d1", titulo: "🔥 Promoção Relâmpago" },
    { id: "d2", titulo: "⚡ Créditos com 20% OFF" },
    { id: "d3", titulo: "🎬 Novos Apps IPTV" },
    { id: "d4", titulo: "💎 Plano Premium" },
    { id: "d5", titulo: "🚀 Ativação Instantânea" },
    { id: "d6", titulo: "🎁 Bônus na 1ª compra" },
  ];
  const source = items.length > 0 ? items : demo;

  // duplicamos 2x para garantir loop infinito visual sem gap
  const track = [...source, ...source];
  const duration = Math.max(20, source.length * 5);

  return (
    <section
      onMouseEnter={() => playSfx("coin", 1500)}
      className="relative overflow-hidden rounded-2xl border border-border/60 bg-surface/40 py-4"
      style={{
        maskImage:
          "linear-gradient(to right, transparent 0, black 6%, black 94%, transparent 100%)",
      }}
    >
      <div
        className="flex gap-6 whitespace-nowrap"
        style={{
          animation: `promo-marquee ${duration}s linear infinite`,
          width: "max-content",
        }}
      >
        {track.map((b, i) => {
          const neons = [
            { grad: "from-fuchsia-500 via-pink-500 to-orange-400", glow: "255,60,180" },
            { grad: "from-violet-500 via-blue-500 to-cyan-400", glow: "80,120,255" },
            { grad: "from-emerald-400 via-teal-400 to-cyan-400", glow: "40,240,200" },
            { grad: "from-amber-400 via-orange-500 to-red-500", glow: "255,140,40" },
            { grad: "from-indigo-500 via-purple-500 to-pink-500", glow: "200,80,255" },
            { grad: "from-lime-400 via-emerald-400 to-teal-400", glow: "120,255,120" },
          ];
          const n = neons[i % neons.length];
          const imageUrl = b.imagem_desktop_url || b.imagem_url || null;
          const inner = (
            <div
              className={`neon-card group relative flex h-24 w-56 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${n.grad} transition-transform hover:scale-[1.08]`}
              style={{
                ["--neon" as never]: n.glow,
                boxShadow: `0 0 0 1px rgba(${n.glow},0.5), 0 0 8px rgba(${n.glow},0.35), 0 0 18px rgba(${n.glow},0.2), inset 0 0 12px rgba(255,255,255,0.08)`,
                animation: `neon-pulse 2.4s ease-in-out ${i * 0.15}s infinite`,
                ...(b.cor_fundo ? { background: b.cor_fundo } : {}),
              }}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={b.titulo}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              ) : (
                <span className="px-3 text-center text-sm font-extrabold uppercase tracking-wide text-white [text-shadow:0_0_8px_rgba(255,255,255,0.6),0_2px_4px_rgba(0,0,0,0.5)]">
                  {b.titulo}
                </span>
              )}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
                style={{
                  background:
                    "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)",
                }}
              />
            </div>
          );
          return b.link ? (
            <a
              key={`${b.id}-${i}`}
              href={b.link}
              target="_blank"
              rel="noreferrer noopener"
              className="shrink-0"
              aria-label={b.titulo}
            >
              {inner}
            </a>
          ) : (
            <div key={`${b.id}-${i}`} className="shrink-0">
              {inner}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes promo-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes neon-pulse {
          0%, 100% {
            filter: brightness(0.92) saturate(1);
          }
          50% {
            filter: brightness(1.05) saturate(1.15);
          }
        }
      `}</style>
    </section>
  );
}
