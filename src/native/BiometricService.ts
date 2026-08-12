/**
 * BiometricService — autenticação por Face ID / Touch ID / impressão digital.
 *
 * Regras:
 *   - Nenhum componente React importa o plugin diretamente.
 *   - Todos os métodos retornam `NativeResult<T>` — sem `throw` para o consumidor.
 *   - Web/PWA: sempre `unsupported`, forçando o fluxo tradicional.
 *   - Cancelamento pelo usuário vira `code: "cancelled"` (estado próprio, não erro).
 *
 * Segurança:
 *   - Este serviço NÃO armazena credenciais.
 *   - A biometria apenas atesta a presença do usuário para
 *     desbloquear uma sessão já existente/válida no Supabase.
 *
 * Plugin: `@aparajita/capacitor-biometric-auth`.
 */
import { isNative, getPlatform } from "@/lib/platform";
import { fail, ok, type NativeResult, unsupported } from "./types";

export type BiometricType = "fingerprint" | "face" | "iris" | "multiple" | "none";

export interface BiometricAvailability {
  /** Hardware biométrico existe neste dispositivo. */
  available: boolean;
  /** Existe pelo menos uma biometria cadastrada no aparelho. */
  enrolled: boolean;
  /** Tipo predominante detectado. */
  type: BiometricType;
  /** Motivo de indisponibilidade quando `available=false`. */
  reason?: string;
}

export interface BiometricPromptOptions {
  /** Motivo exibido no diálogo do sistema (obrigatório em iOS). */
  reason: string;
  /** Título (Android). Default: "Confirme sua identidade". */
  title?: string;
  /** Subtítulo (Android). */
  subtitle?: string;
  /** Rótulo do botão cancelar. Default: "Cancelar". */
  cancelLabel?: string;
  /** Permite fallback para PIN/senha do dispositivo. Default: true. */
  allowDeviceCredential?: boolean;
}

/** Mapeia constantes do plugin para nosso enum interno. */
function mapType(raw: unknown): BiometricType {
  // BiometryType enum do plugin: none=0, touchId=1, faceId=2, fingerprint=3, faceAuth=4, iris=5
  const n = typeof raw === "number" ? raw : Number(raw);
  if (n === 1 || n === 3) return "fingerprint";
  if (n === 2 || n === 4) return "face";
  if (n === 5) return "iris";
  return "none";
}

async function loadPlugin() {
  const mod = await import("@aparajita/capacitor-biometric-auth");
  return mod;
}

export const BiometricService = {
  /**
   * Verifica se o dispositivo possui hardware biométrico e biometria cadastrada.
   * Nunca lança; sempre devolve `NativeResult`.
   */
  async isAvailable(): Promise<NativeResult<BiometricAvailability>> {
    if (!isNative()) {
      return ok<BiometricAvailability>({
        available: false,
        enrolled: false,
        type: "none",
        reason: "unsupported_platform",
      });
    }
    try {
      const { BiometricAuth } = await loadPlugin();
      const info = await BiometricAuth.checkBiometry();
      // info.isAvailable, info.biometryType, info.reason
      return ok<BiometricAvailability>({
        available: Boolean(info?.isAvailable),
        enrolled: Boolean(info?.isAvailable), // plugin combina "enrolled" em isAvailable
        type: mapType(info?.biometryType),
        reason: info?.reason ?? undefined,
      });
    } catch (cause) {
      return fail("not_available", "Falha ao consultar biometria.", cause);
    }
  },

  /**
   * Solicita autenticação biométrica ao usuário.
   * - Sucesso ⇒ `ok(void)`.
   * - Cancelado pelo usuário ⇒ `fail("cancelled")`.
   * - Sem hardware / não cadastrada ⇒ `fail("not_available")`.
   * - Permissão negada / bloqueado ⇒ `fail("permission_denied")`.
   */
  async authenticate(opts: BiometricPromptOptions): Promise<NativeResult<void>> {
    if (!isNative()) {
      return unsupported("BiometricService.authenticate", getPlatform());
    }
    try {
      const { BiometricAuth } = await loadPlugin();
      await BiometricAuth.authenticate({
        reason: opts.reason,
        androidTitle: opts.title ?? "Confirme sua identidade",
        androidSubtitle: opts.subtitle,
        cancelTitle: opts.cancelLabel ?? "Cancelar",
        allowDeviceCredential: opts.allowDeviceCredential ?? true,
        iosFallbackTitle:
          opts.allowDeviceCredential === false ? undefined : "Usar senha do dispositivo",
      });
      return ok(undefined);
    } catch (cause) {
      // Plugin usa códigos padrão: userCancel, appCancel, systemCancel, userFallback,
      // biometryNotAvailable, biometryNotEnrolled, biometryLockout, authenticationFailed, ...
      const code = (cause as { code?: string })?.code ?? "";
      const message =
        (cause as { message?: string })?.message ?? "Falha na autenticação biométrica.";
      if (
        code === "userCancel" ||
        code === "appCancel" ||
        code === "systemCancel" ||
        code === "userFallback"
      ) {
        return fail("cancelled", message, cause);
      }
      if (code === "biometryNotAvailable" || code === "biometryNotEnrolled") {
        return fail("not_available", message, cause);
      }
      if (code === "biometryLockout") {
        return fail("permission_denied", message, cause);
      }
      if (code === "authenticationFailed") {
        return fail("permission_denied", message, cause);
      }
      return fail("unknown", message, cause);
    }
  },
};
