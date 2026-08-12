/**
 * DeviceService — informações do dispositivo (modelo, OS, versão do app, id).
 *
 * Web/PWA: userAgent + language.
 * Native: @capacitor/device (lazy).
 */
import { getPlatform, isNative } from "@/lib/platform";
import { type NativeResult, ok, safeCall } from "./types";

export interface DeviceInfo {
  platform: "android" | "ios" | "web";
  model: string;
  osVersion: string;
  manufacturer?: string;
  appVersion?: string;
  isVirtual: boolean;
  webViewVersion?: string;
  language: string;
}

export interface DeviceCapabilities {
  hasBiometric: boolean;
  hasCamera: boolean;
  hasGeolocation: boolean;
  hasVibration: boolean;
  hasWebShare: boolean;
  hasClipboardWrite: boolean;
  hasClipboardRead: boolean;
  hasNotifications: boolean;
}

export const DeviceService = {
  async getInfo(): Promise<NativeResult<DeviceInfo>> {
    const platform = getPlatform();
    if (!isNative()) {
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : "web";
      const lang = typeof navigator !== "undefined" ? navigator.language : "pt-BR";
      return ok({
        platform,
        model: ua,
        osVersion: "web",
        isVirtual: false,
        language: lang,
      });
    }
    return safeCall("Device.getInfo", async () => {
      const { Device } = await import("@capacitor/device");
      const info = await Device.getInfo();
      const lang = await Device.getLanguageCode().catch(() => ({ value: "pt-BR" }));
      return {
        platform,
        model: info.model,
        osVersion: info.osVersion,
        manufacturer: info.manufacturer,
        isVirtual: info.isVirtual,
        webViewVersion: info.webViewVersion,
        language: lang.value ?? "pt-BR",
      } satisfies DeviceInfo;
    });
  },

  async getId(): Promise<NativeResult<string>> {
    if (!isNative()) {
      // No web usamos um id persistido (não é hardware id, apenas visitor id).
      try {
        const KEY = "mrsl.web.deviceId";
        const existing = localStorage.getItem(KEY);
        if (existing) return ok(existing);
        const id = crypto.randomUUID();
        localStorage.setItem(KEY, id);
        return ok(id);
      } catch {
        return ok("web-anonymous");
      }
    }
    return safeCall("Device.getId", async () => {
      const { Device } = await import("@capacitor/device");
      const { identifier } = await Device.getId();
      return identifier;
    });
  },

  /**
   * Detecta capacidades sem carregar plugins nativos — usa Web APIs
   * quando web e responde otimista (todas true) quando nativo.
   */
  capabilities(): DeviceCapabilities {
    if (typeof window === "undefined") {
      return {
        hasBiometric: false,
        hasCamera: false,
        hasGeolocation: false,
        hasVibration: false,
        hasWebShare: false,
        hasClipboardWrite: false,
        hasClipboardRead: false,
        hasNotifications: false,
      };
    }
    if (isNative()) {
      return {
        hasBiometric: true,
        hasCamera: true,
        hasGeolocation: true,
        hasVibration: true,
        hasWebShare: true,
        hasClipboardWrite: true,
        hasClipboardRead: true,
        hasNotifications: true,
      };
    }
    const nav = navigator as Navigator & {
      share?: unknown;
      vibrate?: unknown;
      geolocation?: unknown;
      mediaDevices?: MediaDevices;
      clipboard?: Clipboard;
    };
    return {
      hasBiometric: false,
      hasCamera: !!nav.mediaDevices?.getUserMedia,
      hasGeolocation: !!nav.geolocation,
      hasVibration: typeof nav.vibrate === "function",
      hasWebShare: typeof nav.share === "function",
      hasClipboardWrite: !!nav.clipboard?.writeText,
      hasClipboardRead: !!nav.clipboard?.readText,
      hasNotifications: "Notification" in window,
    };
  },
};
