import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles, Coins, LogOut, ArrowRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { BrandMark, BRAND_NAME, BRAND_TAGLINE } from "@/components/brand";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { playSfx } from "@/lib/sfx";

/**
 * Modal de "incentivo antes de sair":
 * - Logo grande em destaque
 * - Mensagem persuasiva para o revendedor não abandonar a plataforma
 * - CTA principal: ir para /creditos (aproveitar ofertas)
 * - CTA secundário: continuar navegando (fecha o modal)
 * - Link discreto: sair mesmo assim (executa signOut)
 */
export function LogoutIncentiveDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  async function reallySignOut() {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
    } finally {
      setSigningOut(false);
      onOpenChange(false);
      navigate({ to: "/login" });
    }
  }

  function goToOffers() {
    playSfx("level-up");
    onOpenChange(false);
    navigate({ to: "/creditos" });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg overflow-hidden border-border/70 bg-surface/95 p-0 backdrop-blur-xl"
        style={{
          boxShadow:
            "0 0 0 1px oklch(1 0 0 / 6%), 0 40px 120px -20px oklch(0 0 0 / 80%), 0 0 80px -20px color-mix(in oklab, var(--brand-magenta) 60%, transparent)",
        }}
      >
        {/* halo de fundo */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(80% 60% at 50% 0%, color-mix(in oklab, var(--brand-magenta) 22%, transparent), transparent 70%), radial-gradient(60% 50% at 50% 100%, color-mix(in oklab, var(--brand-blue) 18%, transparent), transparent 70%)",
          }}
        />

        <div className="relative flex flex-col items-center gap-5 px-8 pb-8 pt-10 text-center">
          {/* LOGO GRANDE EM DESTAQUE */}
          <div className="relative">
            <BrandMark size={140} />
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-foreground/60">
              {BRAND_TAGLINE} · {BRAND_NAME}
            </p>
            <DialogTitle className="bg-gradient-to-r from-fuchsia-300 via-pink-300 to-amber-200 bg-clip-text text-2xl font-extrabold text-transparent">
              Espera! Antes de sair…
            </DialogTitle>
          </div>

          <DialogDescription className="max-w-md text-[15px] leading-relaxed text-foreground/75">
            Que tal aproveitar as ofertas de hoje? Recarregue seus{" "}
            <span className="font-semibold text-foreground">créditos com desconto</span>, garanta
            seu <span className="font-semibold text-foreground">plano Premium</span> e continue
            ativando licenças <span className="whitespace-nowrap">sem limites</span>.
          </DialogDescription>

          {/* mini destaques */}
          <div className="mt-1 grid w-full grid-cols-3 gap-2">
            <MiniPerk icon={Coins} label="Créditos c/ OFF" />
            <MiniPerk icon={Sparkles} label="Bônus na 1ª" />
            <MiniPerk icon={ArrowRight} label="Ativação já" />
          </div>

          {/* CTAs */}
          <div className="mt-3 flex w-full flex-col gap-2">
            <Button
              onClick={goToOffers}
              className="h-12 w-full gap-2 gradient-primary text-base font-semibold text-primary-foreground shadow-lg shadow-fuchsia-500/20 hover:opacity-95"
            >
              <Sparkles className="size-4" />
              Ver ofertas agora
            </Button>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-10 w-full text-sm text-foreground/70 hover:text-foreground"
            >
              Continuar navegando
            </Button>
          </div>

          {/* link discreto para sair mesmo assim */}
          <button
            type="button"
            onClick={reallySignOut}
            disabled={signingOut}
            className="mt-1 inline-flex items-center gap-1.5 text-xs text-foreground/45 underline-offset-4 transition hover:text-destructive hover:underline disabled:opacity-50"
          >
            <LogOut className="size-3" />
            {signingOut ? "Saindo…" : "Sair mesmo assim"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MiniPerk({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border/60 bg-white/[0.03] px-2 py-2.5">
      <Icon className="size-4 text-foreground/70" />
      <span className="text-[10px] font-medium uppercase tracking-wide text-foreground/60">
        {label}
      </span>
    </div>
  );
}
