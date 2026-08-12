/**
 * Preferências de push do usuário. Fonte primária: tabela
 * `push_preferences` no Supabase (persiste entre dispositivos).
 * Fallback local (offline): StorageService.
 */
import { supabase } from "@/integrations/supabase/client";
import { NativeService } from "@/native/NativeService";
import {
  DEFAULT_CATEGORY_ENABLED,
  PUSH_CATEGORIES,
  type PushCategory,
} from "@/lib/push-categories";

export interface PushPreferences {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  categories: Record<PushCategory, boolean>;
}

const CACHE_KEY = "mrsl.push.prefs";

const DEFAULT_PREFS: PushPreferences = {
  enabled: true,
  sound: true,
  vibration: true,
  categories: { ...DEFAULT_CATEGORY_ENABLED },
};

function normalize(raw: unknown): PushPreferences {
  const r = (raw ?? {}) as Record<string, unknown>;
  const catsRaw = (r.categories ?? {}) as Record<string, unknown>;
  const cats = { ...DEFAULT_CATEGORY_ENABLED };
  for (const k of PUSH_CATEGORIES) {
    if (typeof catsRaw[k] === "boolean") cats[k] = catsRaw[k] as boolean;
  }
  return {
    enabled: typeof r.enabled === "boolean" ? r.enabled : true,
    sound: typeof r.sound === "boolean" ? r.sound : true,
    vibration: typeof r.vibration === "boolean" ? r.vibration : true,
    categories: cats,
  };
}

export async function getPushPreferences(): Promise<PushPreferences> {
  try {
    const { data: sess } = await supabase.auth.getSession();
    if (sess.session?.user) {
      const { data } = await supabase
        .from("push_preferences" as never)
        .select("enabled, sound, vibration, categories")
        .eq("user_id", sess.session.user.id)
        .maybeSingle();
      if (data) {
        const prefs = normalize(data);
        await NativeService.storage.set(CACHE_KEY, JSON.stringify(prefs));
        return prefs;
      }
    }
  } catch (err) {
    console.warn("[push] getPushPreferences remoto falhou:", err);
  }
  const cached = await NativeService.storage.get(CACHE_KEY);
  if (cached.ok && cached.data) {
    try {
      return normalize(JSON.parse(cached.data));
    } catch {
      /* noop */
    }
  }
  return { ...DEFAULT_PREFS };
}

export async function setPushPreferences(next: PushPreferences): Promise<void> {
  const prefs = normalize(next);
  await NativeService.storage.set(CACHE_KEY, JSON.stringify(prefs));
  try {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session?.user) return;
    await supabase.from("push_preferences" as never).upsert(
      {
        user_id: sess.session.user.id,
        enabled: prefs.enabled,
        sound: prefs.sound,
        vibration: prefs.vibration,
        categories: prefs.categories,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "user_id" } as never,
    );
  } catch (err) {
    console.warn("[push] setPushPreferences remoto falhou:", err);
  }
}
