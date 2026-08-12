/**
 * Orquestrador de push notifications.
 *
 * - Só roda em nativo (Android/iOS) — web/PWA é no-op.
 * - Só registra o token quando existe sessão Supabase válida.
 * - Persiste o token na tabela `device_push_tokens` (upsert por token).
 * - Assina eventos e converte toques em deep links via `push-navigation`.
 * - Idempotente: chamar múltiplas vezes não duplica listeners nem tokens.
 */
import type { AnyRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { isNative } from "@/lib/platform";
import { NativeService } from "@/native/NativeService";
import {
  drainPendingPushNavigation,
  navigateFromPush,
  queuePushNavigation,
} from "@/lib/push-navigation";
import { getPushPreferences } from "@/lib/push-preferences";
import { isPushCategory } from "@/lib/push-categories";

let started = false;
const disposers: Array<() => void> = [];
let currentUserId: string | null = null;
let currentToken: string | null = null;

const STORAGE_KEY = "mrsl.push.lastToken";

async function upsertToken(userId: string, token: string, platform: "android" | "ios" | "web") {
  try {
    const [infoRes, idRes] = await Promise.all([
      NativeService.device.getInfo(),
      NativeService.device.getId(),
    ]);
    const deviceId = idRes.ok ? idRes.data : null;
    const appVersion = infoRes.ok ? (infoRes.data.appVersion ?? null) : null;
    await supabase.from("device_push_tokens" as never).upsert(
      {
        user_id: userId,
        token,
        platform,
        device_id: deviceId,
        app_version: appVersion,
        last_seen_at: new Date().toISOString(),
      } as never,
      { onConflict: "token" } as never,
    );
    await NativeService.storage.setSecure(STORAGE_KEY, token);
    currentToken = token;
  } catch (err) {
    console.warn("[push] upsertToken falhou:", err);
  }
}

async function removeToken(token: string) {
  try {
    await supabase
      .from("device_push_tokens" as never)
      .delete()
      .eq("token", token);
  } catch (err) {
    console.warn("[push] removeToken falhou:", err);
  }
}

/**
 * Deve ser chamado após o login (com sessão válida) ou no boot quando já
 * há sessão. Passa o `router` para navegar em cima do toque.
 */
export async function startPush(router: AnyRouter, userId: string): Promise<void> {
  if (!isNative()) return;
  if (started && currentUserId === userId) return;
  if (started) await stopPush(); // trocou de usuário → reinicia

  started = true;
  currentUserId = userId;

  // Respeita a preferência do usuário (categoria "master enabled").
  const prefs = await getPushPreferences();
  if (!prefs.enabled) return;

  // Cold start — se o app foi aberto por um toque, o plugin emitirá
  // `pushNotificationActionPerformed` logo após o `register`. Também
  // capturamos aqui para drenar quando o Router estiver pronto.
  drainPendingPushNavigation(router);

  disposers.push(
    NativeService.push.onTokenChange((reg) => {
      if (!currentUserId) return;
      void upsertToken(currentUserId, reg.token, reg.platform);
    }),
  );

  disposers.push(
    NativeService.push.onRegistrationError((err) => {
      console.warn("[push] registrationError:", err.message);
    }),
  );

  // Foreground: aqui NÃO exibimos toast automático — cada tela decide.
  // Mas filtramos por categoria silenciada.
  disposers.push(
    NativeService.push.onMessage(async (msg) => {
      const cat = msg.data?.category;
      if (isPushCategory(cat)) {
        const p = await getPushPreferences();
        if (p.categories[cat] === false) return; // silenciada
      }
      // Emite um CustomEvent — telas interessadas podem escutar sem
      // acoplar-se ao plugin.
      window.dispatchEvent(new CustomEvent("mrsl:push:received", { detail: msg }));
    }),
  );

  disposers.push(
    NativeService.push.onTap((msg) => {
      if (!navigateFromPush(router, msg.data ?? {})) {
        queuePushNavigation(msg.data ?? {});
      }
    }),
  );

  const reg = await NativeService.push.register();
  if (!reg.ok) {
    console.warn("[push] register:", reg.error.code, reg.error.message);
    return;
  }
  await upsertToken(userId, reg.data.token, reg.data.platform);
}

export async function stopPush(): Promise<void> {
  for (const d of disposers.splice(0, disposers.length)) {
    try {
      d();
    } catch {
      /* noop */
    }
  }
  if (currentToken) {
    await removeToken(currentToken);
    currentToken = null;
  }
  await NativeService.push.unregister();
  await NativeService.storage.removeSecure(STORAGE_KEY);
  started = false;
  currentUserId = null;
}
