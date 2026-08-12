/**
 * HapticsService — feedback tátil.
 *
 * Plugin nativo: @capacitor/haptics.
 * Web/PWA: navigator.vibrate quando disponível, senão no-op.
 *
 * Toda função é fire-and-forget do ponto de vista da UI — nunca bloqueia,
 * nunca throw. Segurança: se o usuário desativa haptics em preferências
 * do OS, o plugin já lida silenciosamente.
 */
import { isNative } from "@/lib/platform";
import { type NativeResult, ok, safeCall } from "./types";

export type HapticStyle = "light" | "medium" | "heavy" | "success" | "warning" | "error";

const WEB_VIBRATION: Record<HapticStyle, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 40,
  success: [15, 40, 15],
  warning: [20, 60, 20],
  error: [40, 60, 40, 60, 40],
};

async function nativeImpact(style: HapticStyle): Promise<void> {
  const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");
  switch (style) {
    case "light":
      await Haptics.impact({ style: ImpactStyle.Light });
      return;
    case "medium":
      await Haptics.impact({ style: ImpactStyle.Medium });
      return;
    case "heavy":
      await Haptics.impact({ style: ImpactStyle.Heavy });
      return;
    case "success":
      await Haptics.notification({ type: NotificationType.Success });
      return;
    case "warning":
      await Haptics.notification({ type: NotificationType.Warning });
      return;
    case "error":
      await Haptics.notification({ type: NotificationType.Error });
      return;
  }
}

function webVibrate(style: HapticStyle): void {
  try {
    (navigator as unknown as { vibrate?: (p: number | number[]) => boolean }).vibrate?.(
      WEB_VIBRATION[style],
    );
  } catch {
    /* noop */
  }
}

export const HapticsService = {
  async impact(style: HapticStyle = "light"): Promise<NativeResult<void>> {
    if (!isNative()) {
      webVibrate(style);
      return ok(undefined);
    }
    return safeCall("Haptics.impact", () => nativeImpact(style));
  },

  // Atalhos semânticos usados pela UI (login, compra, exclusão, erro, etc.)
  light: () => HapticsService.impact("light"),
  medium: () => HapticsService.impact("medium"),
  heavy: () => HapticsService.impact("heavy"),
  success: () => HapticsService.impact("success"),
  warning: () => HapticsService.impact("warning"),
  error: () => HapticsService.impact("error"),

  async selection(): Promise<NativeResult<void>> {
    if (!isNative()) {
      webVibrate("light");
      return ok(undefined);
    }
    return safeCall("Haptics.selectionChanged", async () => {
      const { Haptics } = await import("@capacitor/haptics");
      await Haptics.selectionChanged();
    });
  },
};
