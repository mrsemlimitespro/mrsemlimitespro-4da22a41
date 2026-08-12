import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

// Prompt de instalação PWA: mostra um card flutuante para
// forçar instalação em Android/Chrome (via beforeinstallprompt)
// e um passo-a-passo em iOS/Safari (que não expõe o evento).

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "mrsl_pwa_dismissed_at";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 3; // 3 dias

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
}

function recentlyDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export function PwaInstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (recentlyDismissed()) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    // iOS não dispara beforeinstallprompt — mostra as instruções manualmente.
    if (isIOS()) {
      const t = setTimeout(() => {
        setIosHint(true);
        setVisible(true);
      }, 1500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBip);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  useEffect(() => {
    const onInstalled = () => {
      setVisible(false);
      setEvt(null);
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  async function install() {
    if (!evt) return;
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
      setEvt(null);
    } else {
      dismiss();
    }
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Instalar aplicativo"
      className="fixed inset-x-3 bottom-24 z-[60] mx-auto max-w-md rounded-2xl border border-white/10 bg-surface/95 p-4 shadow-2xl backdrop-blur-xl md:bottom-6 md:left-auto md:right-6 md:mx-0"
      style={{
        boxShadow:
          "0 0 0 1px oklch(1 0 0 / 6%), 0 30px 80px -20px oklch(0 0 0 / 70%), 0 0 60px -6px color-mix(in oklab, var(--brand-magenta) 40%, transparent)",
      }}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fechar"
        className="absolute right-2 top-2 grid size-7 place-items-center rounded-full text-foreground/60 hover:bg-white/5 hover:text-foreground"
      >
        <X className="size-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl gradient-primary">
          <Download className="size-5 text-primary-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Instalar mrsemlimites</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Tenha o app na tela inicial, abertura rápida e experiência em tela cheia.
          </div>

          {iosHint ? (
            <ol className="mt-3 space-y-1 text-xs text-foreground/80">
              <li className="flex items-center gap-2">
                <Share className="size-3.5 text-primary" />
                <span>Toque em Compartilhar</span>
              </li>
              <li>
                2. Escolha <b>Adicionar à Tela de Início</b>
              </li>
              <li>
                3. Confirme em <b>Adicionar</b>
              </li>
            </ol>
          ) : (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={install}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg gradient-primary px-3 py-2 text-sm font-medium text-primary-foreground"
              >
                <Download className="size-4" /> Instalar agora
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
              >
                Depois
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
