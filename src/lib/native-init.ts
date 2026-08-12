/**
 * Inicialização de plugins nativos Capacitor.
 *
 * Chamado uma única vez no `__root.tsx` dentro de `useEffect` — só executa
 * quando o app está rodando dentro do WebView do Capacitor. No navegador
 * web/PWA é no-op.
 */
import { isNative, isAndroid } from "@/lib/platform";
import { installExternalLinkInterceptor } from "@/lib/native-links";
import { StorageService } from "@/native/StorageService";

let initialized = false;
let lastBackPressAt = 0;

/**
 * Tenta fechar overlays abertos (Radix Dialog/Sheet/Popover/DropdownMenu)
 * emulando um ESC. Retorna true se algum overlay foi fechado.
 */
function dismissTopmostOverlay(): boolean {
  if (typeof document === "undefined") return false;
  const overlays = document.querySelectorAll<HTMLElement>(
    '[role="dialog"][data-state="open"], [data-radix-popper-content-wrapper], [data-state="open"][role="menu"], [data-state="open"][role="listbox"]',
  );
  if (overlays.length === 0) return false;
  const esc = new KeyboardEvent("keydown", {
    key: "Escape",
    code: "Escape",
    keyCode: 27,
    which: 27,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(esc);
  return true;
}

export async function initNativePlatform(): Promise<void> {
  if (initialized) return;
  if (!isNative()) return;
  initialized = true;

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch (err) {
    console.warn("[native] splash screen falhou:", err);
  }

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    if (isAndroid()) {
      await StatusBar.setBackgroundColor({ color: "#0a0a0f" });
    }
  } catch (err) {
    console.warn("[native] status bar falhou:", err);
  }

  try {
    // Back button Android — hierarquia:
    // 1. Se houver overlay/modal aberto → fecha.
    // 2. Se há histórico → volta uma tela.
    // 3. Caso contrário → confirma "toque de novo para sair" (2s).
    const { App } = await import("@capacitor/app");
    App.addListener("backButton", ({ canGoBack }) => {
      if (dismissTopmostOverlay()) return;
      if (canGoBack && window.history.length > 1) {
        window.history.back();
        return;
      }
      const now = Date.now();
      if (now - lastBackPressAt < 2000) {
        void App.exitApp();
        return;
      }
      lastBackPressAt = now;
      // Toast leve nativo — sem dependência extra
      try {
        const el = document.createElement("div");
        el.textContent = "Toque em voltar novamente para sair";
        el.setAttribute(
          "style",
          "position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 84px);transform:translateX(-50%);background:rgba(20,20,30,0.92);color:#fff;padding:10px 16px;border-radius:999px;font:500 13px system-ui;z-index:99999;pointer-events:none;backdrop-filter:blur(8px);",
        );
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1800);
      } catch {
        /* ignore */
      }
    });
  } catch (err) {
    console.warn("[native] app listener falhou:", err);
  }

  // Links externos → Capacitor Browser (in-app browser tab).
  installExternalLinkInterceptor();

  // Migração idempotente: leva preferências do localStorage do WebView
  // para o Preferences nativo (persistente entre boots). Roda uma única vez.
  void StorageService.migrateFromWebStorage([
    "theme",
    "mrsl.web.deviceId",
    "mrsl.onboarding.done",
    "mrsl.notifications.optin",
  ]);
}
