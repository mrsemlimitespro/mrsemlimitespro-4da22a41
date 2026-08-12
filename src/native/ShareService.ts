/**
 * ShareService — compartilhamento nativo (Android/iOS) + Web Share API.
 *
 * Plugin nativo: @capacitor/share.
 * Fallback web: navigator.share; se indisponível, copia para clipboard.
 */
import { isNative } from "@/lib/platform";
import { type NativeResult, ok, fail, safeCall } from "./types";

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
  files?: string[]; // paths ou URLs (nativo)
}

export const ShareService = {
  isAvailable(): boolean {
    if (isNative()) return true;
    return (
      typeof navigator !== "undefined" &&
      typeof (navigator as Navigator & { share?: unknown }).share === "function"
    );
  },

  async share(opts: ShareOptions): Promise<NativeResult<void>> {
    if (isNative()) {
      return safeCall("Share.share", async () => {
        const { Share } = await import("@capacitor/share");
        await Share.share({
          title: opts.title,
          text: opts.text,
          url: opts.url,
          dialogTitle: opts.dialogTitle,
          files: opts.files,
        });
      });
    }

    const nav = navigator as Navigator & { share?: (d: ShareOptions) => Promise<void> };
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title: opts.title, text: opts.text, url: opts.url });
        return ok(undefined);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.toLowerCase().includes("abort")) return fail("cancelled", msg);
        // Cai para fallback abaixo.
      }
    }
    // Fallback: copia link/texto para o clipboard.
    const payload = opts.url ?? opts.text ?? opts.title ?? "";
    try {
      await navigator.clipboard?.writeText(payload);
      return ok(undefined);
    } catch (e) {
      return fail("unsupported", "Web Share API indisponível e clipboard bloqueado.", e);
    }
  },

  // Atalhos de conveniência para o domínio do app.
  sharePrompt(prompt: { title: string; url: string; text?: string }): Promise<NativeResult<void>> {
    return this.share({
      title: prompt.title,
      text: prompt.text ?? prompt.title,
      url: prompt.url,
      dialogTitle: "Compartilhar prompt",
    });
  },
  shareAgent(agent: { title: string; url: string }): Promise<NativeResult<void>> {
    return this.share({ title: agent.title, url: agent.url, dialogTitle: "Compartilhar agent" });
  },
  sharePack(pack: { title: string; url: string }): Promise<NativeResult<void>> {
    return this.share({ title: pack.title, url: pack.url, dialogTitle: "Compartilhar pack" });
  },
  shareLink(url: string, title?: string): Promise<NativeResult<void>> {
    return this.share({ url, title, dialogTitle: "Compartilhar link" });
  },
};
