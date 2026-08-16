import { MessageCircle } from "lucide-react";
import { playSfx } from "@/lib/sfx";

const WHATSAPP_PHONE = "5511956915920";
const WHATSAPP_MESSAGE = "Vim do MR Sem Limites, quero conhecer a Extensão da Lovable";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

export function WhatsappZapButton() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => playSfx("swipe")}
      aria-label="Zap Lovable Sem Limites — falar no WhatsApp"
      className="group fixed z-50 inline-flex items-center gap-2 overflow-hidden rounded-full border border-white/15 bg-black/70 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-xl transition-all duration-300 hover:scale-[1.03] hover:border-emerald-300/60 md:px-3 md:py-2 md:text-[11px]"
      style={{
        right: "max(0.75rem, env(safe-area-inset-right))",
        bottom: "calc(5.5rem + env(safe-area-inset-bottom))",
        width: "min(calc(100vw - 1.5rem - env(safe-area-inset-left) - env(safe-area-inset-right)), clamp(160px, 44vw, 180px))",
        maxWidth: "min(72vw, 200px)",
        boxShadow:
          "0 0 0 1px oklch(1 0 0 / 6%), 0 14px 32px -18px oklch(0 0 0 / 70%), 0 0 24px -10px color-mix(in oklab, oklch(0.72 0.19 155) 45%, transparent)",
        backgroundImage:
          "linear-gradient(135deg, color-mix(in oklab, oklch(0.72 0.19 155) 22%, transparent), color-mix(in oklab, oklch(0.68 0.2 250) 14%, transparent))",
      }}
    >
      <span
        aria-hidden
        className="relative grid size-6 shrink-0 place-items-center rounded-full"
        style={{
          background: "linear-gradient(135deg, oklch(0.78 0.19 155), oklch(0.62 0.19 155))",
          boxShadow:
            "0 0 0 1px color-mix(in oklab, oklch(0.78 0.19 155) 55%, transparent), 0 0 14px -4px color-mix(in oklab, oklch(0.78 0.19 155) 70%, transparent)",
        }}
      >
        <span
          aria-hidden
          className="absolute inset-0 rounded-full opacity-60 blur-[5px]"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, oklch(0.78 0.19 155) 60%, transparent) 0%, transparent 70%)",
          }}
        />
        <MessageCircle
          className="relative z-10 size-3 text-black"
          strokeWidth={2.5}
          fill="currentColor"
        />
        <span
          aria-hidden
          className="absolute inset-0 -z-10 animate-ping rounded-full opacity-30"
          style={{ background: "oklch(0.78 0.19 155)" }}
        />
      </span>

      <span className="flex min-w-0 flex-1 flex-col items-start leading-tight">
        <span className="w-full truncate bg-gradient-to-r from-emerald-200 via-white to-emerald-100 bg-clip-text text-transparent">
          Zap Lovable
        </span>
        <span className="w-full truncate text-[8px] tracking-[0.18em] text-white/60 md:text-[9px]">
          Sem Limites
        </span>
      </span>
    </a>
  );
}
