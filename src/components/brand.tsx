import { cn } from "@/lib/utils";
import logoAsset from "@/assets/mr-sem-limites-logo.png.asset.json";
import { useEffect, useState } from "react";

export const BRAND_NAME = "MR sem limites";
export const BRAND_TAGLINE = "PREMIUM";
export const BRAND_LOGO_URL = logoAsset.url;

export function BrandLogo({ 
  className,
  showFull = true 
}: { 
  className?: string;
  showFull?: boolean;
}) {
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden", className)}>
      <img
        src={BRAND_LOGO_URL}
        alt={BRAND_NAME}
        className={cn(
          "h-full w-full object-contain transition-all duration-500",
          !showFull && "scale-150 grayscale brightness-200"
        )}
        draggable={false}
        style={{
          filter: "drop-shadow(0 0 15px color-mix(in oklab, var(--brand-red-neon) 40%, transparent))"
        }}
      />
    </div>
  );
}

export function BrandWatermark() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div 
      className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden opacity-10 md:opacity-15"
      aria-hidden="true"
    >
      <div 
        className="relative aspect-square w-[75vw] max-w-[1200px] animate-pulse"
        style={{ 
          transform: "rotate(-8deg)",
          filter: "blur(1px) drop-shadow(0 0 40px var(--brand-red-neon))",
          animationDuration: "12s",
          mixBlendMode: "lighten"
        }}
      >
        <img
          src={BRAND_LOGO_URL}
          alt=""
          className="h-full w-full object-contain"
          draggable={false}
        />
        
        {/* Decorative corner energy */}
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-brand-red-neon/20 blur-[100px]" />
        <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-brand-orange-neon/20 blur-[100px]" />
      </div>
    </div>
  );
}

export function BrandDecorations() {
  return (
    <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden" aria-hidden="true">
      {/* Top Left energy */}
      <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full border-t-2 border-l-2 border-brand-red-neon/30 blur-sm animate-pulse" />
      
      {/* Top Right futuristic fragment */}
      <div className="absolute right-10 top-10 h-px w-32 bg-gradient-to-r from-transparent via-brand-blue to-transparent opacity-40 rotate-45" />
      <div className="absolute right-12 top-12 h-px w-24 bg-gradient-to-r from-transparent via-brand-cyan to-transparent opacity-30 rotate-45" />
      
      {/* Bottom energy arcs */}
      <div className="absolute -bottom-20 left-1/2 h-40 w-[80vw] -translate-x-1/2 rounded-[100%] border-t border-brand-orange-neon/10 blur-md" />
      <div className="absolute -bottom-24 left-1/2 h-40 w-[60vw] -translate-x-1/2 rounded-[100%] border-t border-brand-red-neon/5 blur-xl" />
    </div>
  );
}

export function BrandMark({
  size = 40,
  className,
  glow = true,
}: {
  size?: number;
  className?: string;
  glow?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-visible",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {glow && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-4 rounded-full blur-2xl"
            style={{
              background:
                "radial-gradient(closest-side, color-mix(in oklab, var(--brand-red-neon) 40%, transparent), transparent 70%)",
              animation: "brand-halo 4s ease-in-out infinite",
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-[1px] rounded-[30%]"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0 65%, var(--brand-red-neon) 78%, var(--brand-orange-neon) 90%, transparent 100%)",
              padding: "1px",
              WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              animation: "brand-scan 3s linear infinite",
              filter: "drop-shadow(0 0 5px var(--brand-red-neon))",
            }}
          />
        </>
      )}
      <img
        src={BRAND_LOGO_URL}
        alt={`${BRAND_NAME} logo`}
        width={size}
        height={size}
        className="relative z-10 h-full w-full object-contain"
        draggable={false}
      />
      <style>{`
        @keyframes brand-halo {
          0%, 100% { opacity: .4; transform: scale(1); }
          50%      { opacity: .7; transform: scale(1.1); }
        }
        @keyframes brand-scan {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </span>
  );
}

export function BrandLockup({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandMark size={36} />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold tracking-[0.14em] text-foreground uppercase">
          {BRAND_NAME}
        </p>
        <p
          className="truncate text-[10px] font-medium tracking-[0.35em]"
          style={{
            background: "var(--gradient-primary)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {BRAND_TAGLINE}
        </p>
      </div>
    </div>
  );
}
