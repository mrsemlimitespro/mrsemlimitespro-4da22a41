/**
 * Native link handling — abre URLs externas via @capacitor/browser
 * (in-app browser tab estilo SFSafariViewController / Chrome Custom Tabs)
 * em vez de deixar o WebView do app navegar para fora.
 *
 * No web/PWA é no-op (o navegador cuida de target="_blank" normalmente).
 */
import { isNative } from "@/lib/platform";

function isExternalHref(href: string): boolean {
  if (!href) return false;
  if (href.startsWith("#") || href.startsWith("/")) return false;
  if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("sms:")) {
    return false;
  }
  try {
    const url = new URL(href, window.location.href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return url.origin !== window.location.origin;
  } catch {
    return false;
  }
}

export async function openExternal(url: string): Promise<void> {
  if (!isNative()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url, presentationStyle: "popover" });
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

let installed = false;

/**
 * Instala um interceptor global de cliques: qualquer <a> com href externo
 * ou target="_blank" é aberto no in-app browser nativo.
 */
export function installExternalLinkInterceptor(): void {
  if (installed) return;
  if (typeof window === "undefined") return;
  if (!isNative()) return;
  installed = true;

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      const isBlank = anchor.target === "_blank";
      if (!isBlank && !isExternalHref(href)) return;

      // Ignora se já foi prevenido, se tem download, ou modificadores.
      if (event.defaultPrevented) return;
      if (anchor.hasAttribute("download")) return;
      const mouseEvt = event as MouseEvent;
      if (mouseEvt.metaKey || mouseEvt.ctrlKey || mouseEvt.shiftKey || mouseEvt.altKey) return;

      event.preventDefault();
      void openExternal(anchor.href);
    },
    { capture: true },
  );
}
