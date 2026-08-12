/**
 * Helpers de sessão biométrica.
 *
 * A biometria NÃO substitui a autenticação Supabase: ela apenas
 * desbloqueia uma sessão já existente e válida no dispositivo.
 *
 * Chaves salvas (via StorageService, camada `secure:` no nativo):
 *   - mrsl.biometric.enabled  → "1" quando o usuário opta por biometria.
 *   - mrsl.biometric.userHint → e-mail (ou parcial) do último login para exibir no botão.
 */
import { NativeService } from "@/native/NativeService";

const KEY_ENABLED = "mrsl.biometric.enabled";
const KEY_HINT = "mrsl.biometric.userHint";

export async function isBiometricEnabled(): Promise<boolean> {
  const r = await NativeService.storage.getSecure(KEY_ENABLED);
  return r.ok && r.data === "1";
}

export async function enableBiometric(userHint?: string): Promise<void> {
  await NativeService.storage.setSecure(KEY_ENABLED, "1");
  if (userHint) await NativeService.storage.setSecure(KEY_HINT, userHint);
}

export async function disableBiometric(): Promise<void> {
  await NativeService.storage.removeSecure(KEY_ENABLED);
  await NativeService.storage.removeSecure(KEY_HINT);
}

export async function getBiometricHint(): Promise<string | null> {
  const r = await NativeService.storage.getSecure(KEY_HINT);
  return r.ok ? r.data : null;
}

/**
 * Solicita biometria para desbloquear a sessão local.
 * Retorna `true` só quando o desbloqueio foi confirmado.
 */
export async function unlockWithBiometric(
  reason = "Desbloquear MR sem limites",
): Promise<
  | { ok: true }
  | {
      ok: false;
      code: "cancelled" | "not_available" | "permission_denied" | "unsupported" | "unknown";
      message: string;
    }
> {
  const avail = await NativeService.biometric.isAvailable();
  if (!avail.ok) {
    return { ok: false, code: "unknown", message: avail.error.message };
  }
  if (!avail.data.available || !avail.data.enrolled) {
    return {
      ok: false,
      code: "not_available",
      message: "Biometria indisponível ou não cadastrada.",
    };
  }
  const r = await NativeService.biometric.authenticate({
    reason,
    title: "MR sem limites",
    subtitle: "Confirme sua identidade",
    allowDeviceCredential: true,
  });
  if (r.ok) return { ok: true };
  const code = r.error.code === "unsupported" ? "unsupported" : r.error.code;
  return { ok: false, code: code as any, message: r.error.message };
}
