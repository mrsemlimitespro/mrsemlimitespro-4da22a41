/**
 * BiometricToggle — switch reutilizável para habilitar/desabilitar
 * autenticação biométrica. Pode ser colocado em qualquer tela de
 * configurações do usuário.
 *
 * NÃO faz login por conta própria — apenas gerencia a preferência.
 * O desbloqueio real acontece na tela de login via `unlockWithBiometric`.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { NativeService } from "@/native/NativeService";
import { disableBiometric, enableBiometric, isBiometricEnabled } from "@/lib/biometric-session";

interface Props {
  /** e-mail ou identificador que aparecerá no botão da tela de login. */
  userHint?: string;
}

export function BiometricToggle({ userHint }: Props) {
  const [supported, setSupported] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [biometricLabel, setBiometricLabel] = useState("Biometria");

  useEffect(() => {
    (async () => {
      const avail = await NativeService.biometric.isAvailable();
      if (avail.ok) {
        setSupported(avail.data.available);
        setEnrolled(avail.data.enrolled);
        if (avail.data.type === "face") setBiometricLabel("Face ID");
        else if (avail.data.type === "fingerprint") setBiometricLabel("Impressão digital");
        else if (avail.data.type === "iris") setBiometricLabel("Íris");
      }
      setEnabled(await isBiometricEnabled());
      setLoading(false);
    })();
  }, []);

  async function toggle() {
    if (loading) return;
    if (enabled) {
      await disableBiometric();
      setEnabled(false);
      toast.success("Biometria desativada.");
      return;
    }
    // Confirma que o usuário consegue autenticar antes de salvar.
    const r = await NativeService.biometric.authenticate({
      reason: "Ative a biometria para acessar o MR sem limites com mais rapidez.",
      title: "Ativar biometria",
    });
    if (!r.ok) {
      if (r.error.code === "cancelled") return;
      toast.error(r.error.message);
      return;
    }
    await enableBiometric(userHint);
    setEnabled(true);
    toast.success(`${biometricLabel} ativada.`);
  }

  if (!NativeService.platform.isNative()) {
    return (
      <div className="rounded-2xl border border-border/60 bg-surface/40 p-4 text-xs text-muted-foreground">
        Autenticação biométrica disponível apenas nos aplicativos Android e iPhone.
      </div>
    );
  }
  if (!supported) {
    return (
      <div className="rounded-2xl border border-border/60 bg-surface/40 p-4 text-xs text-muted-foreground">
        Este dispositivo não possui biometria disponível.
      </div>
    );
  }
  if (!enrolled) {
    return (
      <div className="rounded-2xl border border-border/60 bg-surface/40 p-4 text-xs text-muted-foreground">
        Nenhuma biometria cadastrada no aparelho. Cadastre nas configurações do sistema.
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className="flex w-full items-center justify-between rounded-2xl border border-border/60 bg-surface/40 p-4 text-left transition hover:bg-surface/60"
    >
      <span>
        <span className="block text-sm font-medium text-foreground">
          Entrar com {biometricLabel}
        </span>
        <span className="block text-xs text-muted-foreground">
          Use sua biometria para desbloquear o app rapidamente.
        </span>
      </span>
      <span
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          enabled ? "bg-primary" : "bg-border/70"
        }`}
        aria-hidden
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
            enabled ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
