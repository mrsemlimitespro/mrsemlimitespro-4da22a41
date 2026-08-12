/**
 * PushService — Notificações push (FCM/APNs) via @capacitor/push-notifications
 * com fallback opcional para Web Push (Notification API) em navegadores
 * modernos.
 *
 * Regras da arquitetura:
 *   - Nenhum componente React importa plugins do Capacitor diretamente.
 *   - Todos os métodos retornam `NativeResult<T>` — nunca throw.
 *   - Plugins são carregados via `await import()` (lazy).
 *   - Web/PWA: `register` tenta Web Push; se indisponível → `unsupported`.
 *
 * Fluxos cobertos:
 *   - Permissão + registro (register / checkPermission)
 *   - Token e rotação (onTokenChange)
 *   - Foreground / background / cold-start (onMessage, onTap)
 *   - Erros de registro (onRegistrationError)
 *   - Canais Android por categoria (createChannels)
 *   - Categorias/ações iOS (setCategories)
 *   - Badge (getBadge / setBadge / clearBadge)
 *   - Limpeza da bandeja (clearAll)
 *   - Unregister + removeAllListeners
 */
import { getPlatform, isAndroid, isIOS, isNative, isWeb } from "@/lib/platform";
import { fail, ok, type NativeResult, unsupported, type Platform } from "./types";
import { CATEGORY_LABEL, PUSH_CATEGORIES, type PushCategory } from "@/lib/push-categories";

export interface PushRegistration {
  token: string;
  platform: Exclude<Platform, "web"> | "web";
}

export interface PushMessage {
  id: string;
  title?: string;
  body?: string;
  /** Payload de dados personalizado (route, slug, category, ...). */
  data?: Record<string, unknown>;
}

export interface PushRegistrationError {
  message: string;
  cause?: unknown;
}

export interface PushChannel {
  id: string;
  name: string;
  description?: string;
  importance?: 1 | 2 | 3 | 4 | 5; // 5 = HIGH
  sound?: string;
  vibration?: boolean;
  lights?: boolean;
  lightColor?: string;
  group?: string;
}

export interface PushAction {
  id: string;
  title: string;
  destructive?: boolean;
  requiresAuthentication?: boolean;
  input?: boolean;
}
export interface PushCategoryDef {
  id: string;
  actions: PushAction[];
}

export type PermissionState = "granted" | "denied" | "prompt" | "unsupported";

type Unsubscribe = () => void;

let pluginRef: typeof import("@capacitor/push-notifications") | null = null;
async function loadPlugin() {
  if (!pluginRef) {
    pluginRef = await import("@capacitor/push-notifications");
  }
  return pluginRef;
}

async function addListener<T>(
  event:
    | "registration"
    | "registrationError"
    | "pushNotificationReceived"
    | "pushNotificationActionPerformed",
  cb: (payload: T) => void,
): Promise<Unsubscribe> {
  const { PushNotifications } = await loadPlugin();
  const handle = await (
    PushNotifications as unknown as {
      addListener: (e: string, c: (p: T) => void) => Promise<{ remove: () => Promise<void> }>;
    }
  ).addListener(event, cb);
  return () => {
    void handle.remove();
  };
}

function toMessage(raw: unknown): PushMessage {
  const r = (raw ?? {}) as Record<string, unknown>;
  const data = (r.data ?? {}) as Record<string, unknown>;
  return {
    id: typeof r.id === "string" ? r.id : crypto.randomUUID(),
    title: typeof r.title === "string" ? r.title : undefined,
    body: typeof r.body === "string" ? r.body : undefined,
    data,
  };
}

/** Canais Android padrão — um canal por categoria de push. */
function defaultChannels(): PushChannel[] {
  return PUSH_CATEGORIES.map<PushChannel>((c) => ({
    id: `mrsl_${c}`,
    name: CATEGORY_LABEL[c],
    description: `Notificações da categoria ${CATEGORY_LABEL[c]}`,
    importance: c === "seguranca" || c === "sistema" ? 5 : 4,
    sound: undefined, // usa som padrão do sistema
    vibration: true,
    lights: true,
    lightColor: "#7C3AED",
    group: "mrsl_grupo_principal",
  }));
}

/** Categorias/ações iOS padrão. */
function defaultCategories(): PushCategoryDef[] {
  return [
    {
      id: "mrsl_default",
      actions: [
        { id: "open", title: "Abrir" },
        { id: "dismiss", title: "Dispensar", destructive: true },
      ],
    },
  ];
}

/* ─────────── Web Push fallback (Notification API) ─────────── */

let webListeners: Array<(m: PushMessage) => void> = [];
function webPushSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
}

async function webRegister(): Promise<NativeResult<PushRegistration>> {
  if (!webPushSupported()) return unsupported("PushService.register", "web");
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      return fail("permission_denied", "Permissão de notificações negada.");
    }
    // Sem VAPID configurado, retornamos um token sintético baseado em subscription
    // opcional. O consumidor pode ignorar quando `platform === "web"`.
    const reg = await navigator.serviceWorker.ready.catch(() => null);
    let token = `web:${crypto.randomUUID()}`;
    if (reg && "pushManager" in reg) {
      try {
        const sub = await reg.pushManager.getSubscription();
        if (sub) token = `web:${btoa(JSON.stringify(sub.toJSON())).slice(0, 96)}`;
      } catch {
        /* noop */
      }
    }
    return ok<PushRegistration>({ token, platform: "web" });
  } catch (cause) {
    return fail("unknown", "Falha ao registrar Web Push.", cause);
  }
}

/* ────────────────────────────────────────────────────────── */

export const PushService = {
  async checkPermission(): Promise<NativeResult<PermissionState>> {
    if (isWeb()) {
      if (!webPushSupported()) return ok<PermissionState>("unsupported");
      const p = Notification.permission;
      return ok<PermissionState>(
        p === "granted" ? "granted" : p === "denied" ? "denied" : "prompt",
      );
    }
    try {
      const { PushNotifications } = await loadPlugin();
      const r = await PushNotifications.checkPermissions();
      return ok<PermissionState>(r.receive as PermissionState);
    } catch (cause) {
      return fail("not_available", "Falha ao consultar permissão de push.", cause);
    }
  },

  async register(): Promise<NativeResult<PushRegistration>> {
    if (isWeb()) return webRegister();
    if (!isNative()) return unsupported("PushService.register", getPlatform());
    try {
      const { PushNotifications } = await loadPlugin();
      const perm = await PushNotifications.requestPermissions();
      if (perm.receive !== "granted") {
        return fail("permission_denied", "Permissão de notificações negada.");
      }

      const platform = getPlatform() as Exclude<Platform, "web">;
      const tokenPromise = new Promise<NativeResult<PushRegistration>>((resolve) => {
        let done = false;
        const cleanup: Array<() => void> = [];
        const finish = (r: NativeResult<PushRegistration>) => {
          if (done) return;
          done = true;
          for (const fn of cleanup) fn();
          resolve(r);
        };
        void addListener<{ value: string }>("registration", (t) => {
          finish(ok({ token: t.value, platform }));
        }).then((u) => cleanup.push(u));
        void addListener<{ error: string }>("registrationError", (e) => {
          finish(fail("not_available", `Falha ao registrar: ${e.error}`, e));
        }).then((u) => cleanup.push(u));
        setTimeout(() => finish(fail("unknown", "Tempo esgotado ao registrar push.")), 15000);
      });

      // Cria canais Android antes de registrar
      if (isAndroid()) {
        await PushService.createChannels(defaultChannels());
      }
      if (isIOS()) {
        // categorias iOS podem ser registradas via LocalNotifications, mas o
        // plugin de push aceita ações no payload APNs; guardamos as defs para
        // uso futuro sem quebrar a fase atual.
        void defaultCategories();
      }

      await PushNotifications.register();
      return await tokenPromise;
    } catch (cause) {
      return fail("unknown", "Erro ao registrar push.", cause);
    }
  },

  async unregister(): Promise<NativeResult<void>> {
    if (isWeb()) {
      webListeners = [];
      return ok(undefined);
    }
    if (!isNative()) return unsupported("PushService.unregister", getPlatform());
    try {
      const { PushNotifications } = await loadPlugin();
      await PushNotifications.removeAllListeners();
      return ok(undefined);
    } catch (cause) {
      return fail("unknown", "Falha ao remover listeners de push.", cause);
    }
  },

  /** Cria/atualiza canais de notificação no Android (no-op nas demais). */
  async createChannels(channels: PushChannel[]): Promise<NativeResult<void>> {
    if (!isAndroid()) return ok(undefined);
    try {
      const { PushNotifications } = await loadPlugin();
      const api = PushNotifications as unknown as {
        createChannel?: (c: Record<string, unknown>) => Promise<void>;
      };
      if (!api.createChannel) return ok(undefined);
      for (const ch of channels) {
        await api.createChannel({
          id: ch.id,
          name: ch.name,
          description: ch.description ?? "",
          importance: ch.importance ?? 4,
          sound: ch.sound,
          vibration: ch.vibration ?? true,
          lights: ch.lights ?? true,
          lightColor: ch.lightColor ?? "#7C3AED",
          visibility: 1,
          group: ch.group,
        });
      }
      return ok(undefined);
    } catch (cause) {
      return fail("unknown", "Falha ao criar canais Android.", cause);
    }
  },

  /** Retorna canais Android existentes (útil para debug). */
  async listChannels(): Promise<NativeResult<PushChannel[]>> {
    if (!isAndroid()) return ok([]);
    try {
      const { PushNotifications } = await loadPlugin();
      const api = PushNotifications as unknown as {
        listChannels?: () => Promise<{ channels: PushChannel[] }>;
      };
      if (!api.listChannels) return ok([]);
      const r = await api.listChannels();
      return ok(r.channels ?? []);
    } catch (cause) {
      return fail("unknown", "Falha ao listar canais.", cause);
    }
  },

  /**
   * Registra categorias iOS (ações rápidas). Guardado para uso futuro.
   * No-op quando não suportado.
   */
  async setCategories(_defs: PushCategoryDef[]): Promise<NativeResult<void>> {
    if (!isIOS()) return ok(undefined);
    // O plugin de push oficial não expõe categorias; a app deve declarar
    // no `UNUserNotificationCenter` no lado nativo. Deixamos o contrato pronto.
    return ok(undefined);
  },

  onTokenChange(cb: (reg: PushRegistration) => void): Unsubscribe {
    if (!isNative()) return () => {};
    const platform = getPlatform() as Exclude<Platform, "web">;
    let inner: Unsubscribe | null = null;
    void addListener<{ value: string }>("registration", (t) => {
      cb({ token: t.value, platform });
    }).then((u) => (inner = u));
    return () => {
      inner?.();
    };
  },

  onRegistrationError(cb: (err: PushRegistrationError) => void): Unsubscribe {
    if (!isNative()) return () => {};
    let inner: Unsubscribe | null = null;
    void addListener<{ error: string }>("registrationError", (e) => {
      cb({ message: e.error, cause: e });
    }).then((u) => (inner = u));
    return () => {
      inner?.();
    };
  },

  onMessage(cb: (msg: PushMessage) => void): Unsubscribe {
    if (isWeb()) {
      webListeners.push(cb);
      return () => {
        webListeners = webListeners.filter((f) => f !== cb);
      };
    }
    if (!isNative()) return () => {};
    let inner: Unsubscribe | null = null;
    void addListener("pushNotificationReceived", (raw) => cb(toMessage(raw))).then(
      (u) => (inner = u),
    );
    return () => {
      inner?.();
    };
  },

  onTap(cb: (msg: PushMessage) => void): Unsubscribe {
    if (!isNative()) return () => {};
    let inner: Unsubscribe | null = null;
    void addListener("pushNotificationActionPerformed", (raw: unknown) => {
      const r = (raw ?? {}) as { notification?: unknown };
      cb(toMessage(r.notification ?? r));
    }).then((u) => (inner = u));
    return () => {
      inner?.();
    };
  },

  /** Limpa todas as notificações da bandeja. */
  async clearAll(): Promise<NativeResult<void>> {
    if (!isNative()) return ok(undefined);
    try {
      const { PushNotifications } = await loadPlugin();
      await PushNotifications.removeAllDeliveredNotifications();
      return ok(undefined);
    } catch (cause) {
      return fail("unknown", "Falha ao limpar notificações.", cause);
    }
  },

  /** Badge do ícone do app (iOS). No-op no Android/Web. */
  async getBadge(): Promise<NativeResult<number>> {
    if (!isIOS()) return ok(0);
    try {
      const { PushNotifications } = await loadPlugin();
      const api = PushNotifications as unknown as {
        getDeliveredNotifications: () => Promise<{ notifications: unknown[] }>;
      };
      const r = await api.getDeliveredNotifications();
      return ok(r.notifications.length);
    } catch (cause) {
      return fail("unknown", "Falha ao ler badge.", cause);
    }
  },

  async clearBadge(): Promise<NativeResult<void>> {
    return PushService.clearAll();
  },

  /** Utilitário para PushBootstrapper simular recepção via Web Push. */
  _emitWebMessage(msg: PushMessage) {
    for (const l of webListeners) {
      try {
        l(msg);
      } catch {
        /* noop */
      }
    }
  },
};
