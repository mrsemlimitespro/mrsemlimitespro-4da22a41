/**
 * Categorias de notificação do MR sem limites.
 * Mantido como fonte única para o app e para o backend.
 */
export const PUSH_CATEGORIES = [
  "compras",
  "promocoes",
  "atualizacoes",
  "ia",
  "licencas",
  "sistema",
  "seguranca",
  "mensagens",
] as const;

export type PushCategory = (typeof PUSH_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<PushCategory, string> = {
  compras: "Compras",
  promocoes: "Promoções",
  atualizacoes: "Atualizações",
  ia: "Inteligência Artificial",
  licencas: "Licenças",
  sistema: "Sistema",
  seguranca: "Segurança",
  mensagens: "Mensagens",
};

/** Categorias silenciadas por padrão? Nenhuma. */
export const DEFAULT_CATEGORY_ENABLED: Record<PushCategory, boolean> = {
  compras: true,
  promocoes: true,
  atualizacoes: true,
  ia: true,
  licencas: true,
  sistema: true,
  seguranca: true,
  mensagens: true,
};

export function isPushCategory(v: unknown): v is PushCategory {
  return typeof v === "string" && (PUSH_CATEGORIES as readonly string[]).includes(v);
}
