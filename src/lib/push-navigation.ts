/**
 * Deep link routing para notificações push.
 *
 * A notificação carrega `data.route` (chave canônica) e opcionalmente
 * parâmetros como `data.slug`. Este módulo converte esse payload em
 * uma navegação TanStack Router, sem inventar telas que não existem.
 */
import type { AnyRouter } from "@tanstack/react-router";

export interface PushRoutePayload {
  route?: string;
  slug?: string;
  url?: string; // rota absoluta pronta, tem prioridade se presente
  [k: string]: unknown;
}

type RouteResolver = (
  data: PushRoutePayload,
) => { to: string; params?: Record<string, string> } | null;

/**
 * Mapa canônico de "route key" → rota TanStack existente.
 * Só existem rotas realmente presentes em `src/routes/`.
 */
const ROUTE_MAP: Record<string, RouteResolver> = {
  home: () => ({ to: "/" }),
  packs: (d) =>
    typeof d.slug === "string" && d.slug.length > 0
      ? { to: "/packs/$slug", params: { slug: d.slug } }
      : { to: "/packs" },
  pack: (d) =>
    typeof d.slug === "string" && d.slug.length > 0
      ? { to: "/packs/$slug", params: { slug: d.slug } }
      : { to: "/packs" },
  prompts: () => ({ to: "/prompts" }),
  agents: () => ({ to: "/agents" }),
  clientes: () => ({ to: "/clientes" }),
  aulas: () => ({ to: "/aulas" }),
  licencas: () => ({ to: "/licencas" }),
  perfil: () => ({ to: "/perfil" }),
  creditos: () => ({ to: "/creditos" }),
  loja: () => ({ to: "/creditos" }),
  promocoes: () => ({ to: "/packs" }),
};

function normalizeData(raw: unknown): PushRoutePayload {
  if (!raw || typeof raw !== "object") return {};
  return raw as PushRoutePayload;
}

/**
 * Executa a navegação encontrada no payload. Retorna `true` quando
 * navegou de fato.
 */
export function navigateFromPush(router: AnyRouter, raw: unknown): boolean {
  const data = normalizeData(raw);

  // URL absoluta interna (ex.: "/packs/abc") tem prioridade
  if (typeof data.url === "string" && data.url.startsWith("/")) {
    void router.navigate({ to: data.url as never });
    return true;
  }

  const key = typeof data.route === "string" ? data.route.toLowerCase() : "";
  const resolver = ROUTE_MAP[key];
  if (!resolver) return false;
  const target = resolver(data);
  if (!target) return false;
  void router.navigate({ to: target.to as never, params: target.params as never });
  return true;
}

/**
 * Fila para navegações que chegam antes do Router estar montado
 * (ex.: app iniciado a partir do toque na notificação).
 */
let pendingPayload: unknown = null;
export function queuePushNavigation(raw: unknown) {
  pendingPayload = raw;
}
export function drainPendingPushNavigation(router: AnyRouter): boolean {
  if (!pendingPayload) return false;
  const p = pendingPayload;
  pendingPayload = null;
  return navigateFromPush(router, p);
}
