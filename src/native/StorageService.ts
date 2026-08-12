/**
 * StorageService — armazenamento chave-valor persistente + secure.
 *
 * Regras:
 * - Web/PWA: sempre localStorage (não há keychain no navegador).
 * - Native (Android/iOS): @capacitor/preferences.
 * - Chaves com prefixo `secure:` são reservadas para futura migração para
 *   Keychain/Keystore (secure-storage plugin) sem quebrar a API.
 *
 * Migração automática: em plataforma nativa, na primeira leitura de uma
 * chave via `getWithMigration`, se ela existir no localStorage do WebView
 * mas não no Preferences, transferimos e removemos do localStorage.
 */
import { isNative } from "@/lib/platform";
import { type NativeResult, ok, safeCall } from "./types";

const MIGRATED_FLAG = "mrsl.storage.migrated";

function safeLocalGet(key: string): string | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeLocalSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* noop */
  }
}
function safeLocalRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

async function nativeGet(key: string): Promise<string | null> {
  const { Preferences } = await import("@capacitor/preferences");
  const { value } = await Preferences.get({ key });
  return value ?? null;
}
async function nativeSet(key: string, value: string): Promise<void> {
  const { Preferences } = await import("@capacitor/preferences");
  await Preferences.set({ key, value });
}
async function nativeRemove(key: string): Promise<void> {
  const { Preferences } = await import("@capacitor/preferences");
  await Preferences.remove({ key });
}

export const StorageService = {
  async get(key: string): Promise<NativeResult<string | null>> {
    if (!isNative()) return ok(safeLocalGet(key));
    return safeCall("Preferences.get", async () => nativeGet(key));
  },

  async set(key: string, value: string): Promise<NativeResult<void>> {
    if (!isNative()) {
      safeLocalSet(key, value);
      return ok(undefined);
    }
    return safeCall("Preferences.set", async () => nativeSet(key, value));
  },

  async remove(key: string): Promise<NativeResult<void>> {
    if (!isNative()) {
      safeLocalRemove(key);
      return ok(undefined);
    }
    return safeCall("Preferences.remove", async () => nativeRemove(key));
  },

  async clear(): Promise<NativeResult<void>> {
    if (!isNative()) {
      try {
        localStorage.clear();
      } catch {
        /* noop */
      }
      return ok(undefined);
    }
    return safeCall("Preferences.clear", async () => {
      const { Preferences } = await import("@capacitor/preferences");
      await Preferences.clear();
    });
  },

  /**
   * `secure:*` — hoje persistido em Preferences (Android SharedPreferences /
   * iOS UserDefaults). Fase futura pode trocar para Keychain/Keystore sem
   * mudar a API pública.
   */
  async getSecure(key: string): Promise<NativeResult<string | null>> {
    return this.get(`secure:${key}`);
  },
  async setSecure(key: string, value: string): Promise<NativeResult<void>> {
    return this.set(`secure:${key}`, value);
  },
  async removeSecure(key: string): Promise<NativeResult<void>> {
    return this.remove(`secure:${key}`);
  },

  /**
   * Migração idempotente: no primeiro boot nativo, move as chaves indicadas
   * do localStorage do WebView para Preferences (persistente entre boots).
   *
   * Chame no init (native-init.ts) com a lista de chaves sensíveis
   * (session tokens, preferências do usuário). No web é no-op.
   */
  async migrateFromWebStorage(keys: string[]): Promise<NativeResult<{ migrated: number }>> {
    if (!isNative()) return ok({ migrated: 0 });
    try {
      const alreadyMigrated = await nativeGet(MIGRATED_FLAG);
      if (alreadyMigrated === "1") return ok({ migrated: 0 });
      let migrated = 0;
      for (const k of keys) {
        const web = safeLocalGet(k);
        if (web == null) continue;
        const existing = await nativeGet(k);
        if (existing != null) continue;
        await nativeSet(k, web);
        safeLocalRemove(k);
        migrated += 1;
      }
      await nativeSet(MIGRATED_FLAG, "1");
      return ok({ migrated });
    } catch (cause) {
      return { ok: false, error: { code: "unknown", message: "Migração falhou", cause } };
    }
  },
};
