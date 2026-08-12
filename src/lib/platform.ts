/**
 * Detecção de plataforma para MR Sem Limites.
 *
 * Uso em componentes/hooks:
 *   import { isNative, isAndroid, isIOS, isWeb } from "@/lib/platform";
 *
 * `isNative()` = true quando rodando dentro do WebView do Capacitor (APK/IPA).
 * `isWeb()`    = true no navegador (desktop, mobile web, PWA instalado).
 *
 * Segue a mesma API do Capacitor, mas com fallbacks seguros para SSR
 * (durante SSR retorna sempre `false` — as verificações só resolvem no cliente).
 */
import { Capacitor } from "@capacitor/core";

export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function isAndroid(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Capacitor.getPlatform() === "android";
  } catch {
    return false;
  }
}

export function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Capacitor.getPlatform() === "ios";
  } catch {
    return false;
  }
}

export function isWeb(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return Capacitor.getPlatform() === "web";
  } catch {
    return true;
  }
}

/**
 * Detecta se o app está rodando como PWA instalado (fora do WebView nativo).
 */
export function isPWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Retorna o nome da plataforma atual: "android" | "ios" | "web".
 */
export function getPlatform(): "android" | "ios" | "web" {
  if (typeof window === "undefined") return "web";
  try {
    return Capacitor.getPlatform() as "android" | "ios" | "web";
  } catch {
    return "web";
  }
}
