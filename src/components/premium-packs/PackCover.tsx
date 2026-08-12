/**
 * PackCover — componente único e canônico para exibir capas/banners de Packs.
 *
 * Adaptação MR Sem Limites: removida a dependência de `@/lib/cover-cache`
 * (não existe neste projeto). Mantém aspect-ratio por variant, object-cover
 * automático com fallback para contain + blur quando o aspecto diverge,
 * skeleton shimmer e placeholder.
 */
import { useEffect, useState, type CSSProperties } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "hero" | "banner" | "card" | "thumb" | "library" | "avatar" | "square";

const ASPECTS: Record<Variant, string> = {
  hero: "aspect-[16/9]",
  banner: "aspect-[21/9]",
  card: "aspect-[3/4]",
  thumb: "aspect-[3/4]",
  library: "aspect-[3/4]",
  avatar: "aspect-square",
  square: "aspect-square",
};

type Props = {
  src?: string | null;
  alt?: string;
  title?: string;
  variant?: Variant;
  className?: string;
  rounded?: string;
  priority?: boolean;
  fit?: "cover" | "contain" | "auto";
  overlay?: React.ReactNode;
  style?: CSSProperties;
};

export function PackCover({
  src,
  alt,
  title,
  variant = "card",
  className,
  rounded = "rounded-xl",
  priority,
  fit = "auto",
  overlay,
  style,
}: Props) {
  const trimmed = typeof src === "string" ? src.trim() : "";
  const has = !!trimmed;

  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
    setDims(null);
  }, [trimmed]);

  const aspect = ASPECTS[variant];

  let resolvedFit: "cover" | "contain" = "cover";
  if (fit === "contain") resolvedFit = "contain";
  else if (fit === "cover") resolvedFit = "cover";
  else if (dims) {
    const targetMap: Record<Variant, number> = {
      hero: 16 / 9,
      banner: 21 / 9,
      card: 3 / 4,
      thumb: 3 / 4,
      library: 3 / 4,
      avatar: 1,
      square: 1,
    };
    const target = targetMap[variant];
    const imgRatio = dims.w / dims.h;
    const dev = Math.abs(imgRatio - target) / target;
    if (dev > 0.3) resolvedFit = "contain";
  }

  return (
    <div
      className={cn("relative overflow-hidden bg-black/60", aspect, rounded, className)}
      style={style}
      data-variant={variant}
    >
      {!loaded && !errored && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/[0.04] via-white/[0.08] to-white/[0.04]" />
      )}

      {has && !errored ? (
        <>
          {resolvedFit === "contain" && (
            <>
              <img
                src={trimmed}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-black/30" aria-hidden />
            </>
          )}
          <img
            src={trimmed}
            alt={alt ?? title ?? ""}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            className={cn(
              "relative z-10 h-full w-full transition-opacity duration-500",
              resolvedFit === "cover" ? "object-cover object-center" : "object-contain",
              loaded ? "opacity-100" : "opacity-0",
            )}
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth && img.naturalHeight) {
                setDims({ w: img.naturalWidth, h: img.naturalHeight });
              }
              setLoaded(true);
            }}
            onError={() => setErrored(true)}
          />
        </>
      ) : (
        <PlaceholderArt title={title} />
      )}

      {overlay && <div className="pointer-events-none absolute inset-0 z-20">{overlay}</div>}
    </div>
  );
}

function PlaceholderArt({ title }: { title?: string }) {
  const initial = (title?.trim()?.[0] || "P").toUpperCase();
  return (
    <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_30%,var(--ai-500,rgba(16,185,129,0.20)),transparent_60%),radial-gradient(circle_at_70%_70%,var(--ai-400,rgba(163,230,53,0.10)),transparent_60%)]">
      <div className="flex flex-col items-center gap-1 text-ai-100/50">
        <div className="grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/5 text-lg font-black text-ai-50/70">
          {initial}
        </div>
        <ImageIcon className="h-3.5 w-3.5 opacity-50" />
      </div>
    </div>
  );
}

export default PackCover;
