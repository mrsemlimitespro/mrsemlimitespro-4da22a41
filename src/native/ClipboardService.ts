/**
 * ClipboardService — leitura e escrita da área de transferência.
 *
 * Plugin: @capacitor/clipboard (Android/iOS).
 * Web/PWA: navigator.clipboard.
 */
import { isNative } from "@/lib/platform";
import { type NativeResult, ok, fail, safeCall } from "./types";

export const ClipboardService = {
  async write(text: string): Promise<NativeResult<void>> {
    if (isNative()) {
      return safeCall("Clipboard.write", async () => {
        const { Clipboard } = await import("@capacitor/clipboard");
        await Clipboard.write({ string: text });
      });
    }
    try {
      await navigator.clipboard.writeText(text);
      return ok(undefined);
    } catch (e) {
      // Fallback antigo (ex: iframes/preview): execCommand em textarea.
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok2 = document.execCommand("copy");
        ta.remove();
        if (ok2) return ok(undefined);
        return fail("not_available", "Clipboard indisponível.", e);
      } catch (e2) {
        return fail("not_available", "Clipboard indisponível.", e2);
      }
    }
  },

  async read(): Promise<NativeResult<string>> {
    if (isNative()) {
      return safeCall("Clipboard.read", async () => {
        const { Clipboard } = await import("@capacitor/clipboard");
        const { value } = await Clipboard.read();
        return value ?? "";
      });
    }
    try {
      return ok(await navigator.clipboard.readText());
    } catch (e) {
      return fail("permission_denied", "Sem permissão de leitura do clipboard.", e);
    }
  },
};
