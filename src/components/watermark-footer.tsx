const TEXT = "◆ MR SEM LIMITES · PREMIUM ACCESS ◆";

export function WatermarkFooter() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-0 z-0 flex justify-center px-4"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 6px)" }}
    >
      <p
        className="select-none truncate text-center text-[10px] font-bold uppercase tracking-[0.42em] md:text-[11px]"
        style={{
          fontFamily:
            'ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, "Courier New", monospace',
          background:
            "linear-gradient(90deg, color-mix(in oklab, var(--brand-magenta) 90%, transparent) 0%, color-mix(in oklab, var(--brand-blue) 90%, transparent) 50%, color-mix(in oklab, var(--brand-magenta) 90%, transparent) 100%)",
          backgroundSize: "200% 100%",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
          textShadow: "0 0 18px color-mix(in oklab, var(--brand-magenta) 35%, transparent)",
          filter:
            "drop-shadow(0 0 6px color-mix(in oklab, var(--brand-blue) 25%, transparent))",
          animation: "watermark-shine 6s linear infinite",
        }}
      >
        {TEXT}
      </p>
      <style>{`
        @keyframes watermark-shine {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>
    </div>
  );
}
