/**
 * SmartCover — exibe imagens respeitando o aspect ratio original.
 * Adaptado do Link MR Store Pro. Fallback interno (sem AutoCover externo)
 * e sem cache remoto — mantém o mesmo comportamento visual.
 */
import { useEffect, useState } from "react";

type Props = {
  capaUrl?: string | null;
  title: string;
  className?: string;
  alt?: string;
  rounded?: string;
};

function isAutoCoverUri(u: string | null | undefined): boolean {
  return !!u && u.startsWith("autocover://");
}

/** Gera uma cor determinística a partir do título (usada no fallback). */
function hashHue(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

function AutoCoverFallback({ title }: { title: string }) {
  const hue1 = hashHue(title || "prompt");
  const hue2 = (hue1 + 60) % 360;
  const initials =
    (title || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?";
  return (
    <div
      className="relative h-full w-full grid place-items-center overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(135deg, hsl(${hue1} 70% 45%) 0%, hsl(${hue2} 70% 25%) 100%)`,
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.35) 0px, transparent 40%), radial-gradient(circle at 70% 70%, rgba(0,0,0,0.35) 0px, transparent 40%)",
        }}
      />
      <span className="relative z-10 text-4xl font-black tracking-tight text-white/85 drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
        {initials}
      </span>
    </div>
  );
}

export function SmartCover({ capaUrl, title, className, alt, rounded = "rounded-md" }: Props) {
  const trimmed = typeof capaUrl === "string" ? capaUrl.trim() : "";
  const hasReal = !!trimmed && !isAutoCoverUri(trimmed);

  const [errored, setErrored] = useState(false);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    setErrored(false);
    setDims(null);
  }, [trimmed, hasReal]);

  if (!hasReal || errored) {
    return (
      <div className={`${className ?? ""} ${rounded} overflow-hidden`}>
        <AutoCoverFallback title={title} />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-black ${rounded} ${className ?? ""}`}
      data-orientation={
        dims ? (dims.w > dims.h ? "landscape" : dims.w < dims.h ? "portrait" : "square") : "unknown"
      }
    >
      <img
        src={trimmed}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60"
        loading="lazy"
        decoding="async"
      />
      <div className="absolute inset-0 bg-black/30" aria-hidden />
      <img
        src={trimmed}
        alt={alt ?? title}
        className="relative z-10 w-full h-full object-contain"
        loading="lazy"
        decoding="async"
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth && img.naturalHeight) {
            setDims({ w: img.naturalWidth, h: img.naturalHeight });
          }
        }}
        onError={() => setErrored(true)}
      />
    </div>
  );
}

export default SmartCover;
