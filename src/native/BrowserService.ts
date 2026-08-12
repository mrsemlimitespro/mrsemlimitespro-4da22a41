/**
 * BrowserService — abertura de URLs externas em in-app browser tab.
 *
 * Web/PWA: window.open com noopener.
 * Native: @capacitor/browser (Chrome Custom Tab / SFSafariViewController).
 */
import { isNative } from "@/lib/platform";
import { type NativeResult, ok, safeCall } from "./types";

export interface OpenOptions {
  url: string;
  presentationStyle?: "popover" | "fullscreen";
}

export const BrowserService = {
  async open(opts: OpenOptions): Promise<NativeResult<void>> {
    if (!isNative()) {
      window.open(opts.url, "_blank", "noopener,noreferrer");
      return ok(undefined);
    }
    return safeCall("Browser.open", async () => {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url: opts.url, presentationStyle: opts.presentationStyle ?? "popover" });
    });
  },

  async close(): Promise<NativeResult<void>> {
    if (!isNative()) return ok(undefined);
    return safeCall("Browser.close", async () => {
      const { Browser } = await import("@capacitor/browser");
      await Browser.close();
    });
  },
};
