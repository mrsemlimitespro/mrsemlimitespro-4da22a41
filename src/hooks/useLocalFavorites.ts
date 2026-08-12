/**
 * Local favorites — fallback leve (localStorage) para módulos AI.
 * Evita depender de tabelas de favoritos que não existem no MR Sem Limites
 * (o destino tem `prompt_favorites`, mas não uma tabela equivalente para
 * agentes). Escopo é por `kind` (ex: "ai-agent").
 */
import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "mrsl:favs:";

function readSet(kind: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + kind);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    /* ignore */
  }
  return new Set();
}

function writeSet(kind: string, set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + kind, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

export function useLocalFavorites(kind: string) {
  const [ids, setIds] = useState<Set<string>>(() => readSet(kind));

  useEffect(() => {
    setIds(readSet(kind));
  }, [kind]);

  const isFav = useCallback((id: string) => ids.has(id), [ids]);

  const toggle = useCallback(
    (id: string) => {
      setIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        writeSet(kind, next);
        return next;
      });
    },
    [kind],
  );

  return { isFav, toggle };
}
