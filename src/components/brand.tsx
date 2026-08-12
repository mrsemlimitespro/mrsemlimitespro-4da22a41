import logoAsset from "@/assets/mr-sem-limites-logo.png.asset.json";
import { cn } from "@/lib/utils";

export const BRAND_NAME = "MR sem limites";
export const BRAND_TAGLINE = "PREMIUM";
export const BRAND_LOGO_URL = logoAsset.url;

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
        "relative inline-grid shrink-0 place-items-center overflow-visible rounded-[26%]",
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
                "radial-gradient(closest-side, color-mix(in oklab, var(--brand-magenta) 80%, transparent), transparent 70%)",
              animation: "brand-halo 2.6s ease-in-out infinite",
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-2 rounded-full blur-xl"
            style={{
              background:
                "radial-gradient(closest-side, color-mix(in oklab, var(--brand-blue) 70%, transparent), transparent 70%)",
              animation: "brand-halo 2.6s ease-in-out 0.6s infinite",
            }}
          />
          {/* Border Scan — anel de luz girando em volta da logo */}
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-[3px] rounded-[30%]"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0 65%, color-mix(in oklab, var(--brand-magenta) 100%, transparent) 78%, color-mix(in oklab, var(--brand-blue) 100%, transparent) 90%, transparent 100%)",
              padding: "2px",
              WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              animation: "brand-scan 3s linear infinite",
              filter:
                "drop-shadow(0 0 6px color-mix(in oklab, var(--brand-magenta) 80%, transparent))",
            }}
          />
        </>
      )}
      <span
        className="relative inline-grid h-full w-full place-items-center overflow-hidden rounded-[26%]"
        style={{
          boxShadow: glow
            ? "0 0 0 1.5px color-mix(in oklab, var(--brand-magenta) 90%, transparent), 0 0 32px -2px color-mix(in oklab, var(--brand-magenta) 95%, transparent), 0 0 48px -4px color-mix(in oklab, var(--brand-blue) 80%, transparent), 0 0 80px -10px color-mix(in oklab, var(--brand-magenta) 70%, transparent)"
            : undefined,
        }}
      >
        <img
          src={BRAND_LOGO_URL}
          alt={`${BRAND_NAME} logo`}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          draggable={false}
        />
      </span>
      {glow && (
        <style>{`
          @keyframes brand-halo {
            0%, 100% { opacity: .55; transform: scale(1); }
            50%      { opacity: 1;   transform: scale(1.12); }
          }
          @keyframes brand-scan {
            to { transform: rotate(360deg); }
          }
        `}</style>
      )}
    </span>
  );
}

export function BrandLockup({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandMark size={36} />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold tracking-[0.14em] text-foreground">
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
