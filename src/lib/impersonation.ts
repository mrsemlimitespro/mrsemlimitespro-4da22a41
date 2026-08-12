/**
 * Impersonation (modo visualização do Admin).
 *
 * Somente client-side. NÃO altera sessão. NÃO altera role. NÃO grava nada.
 * O admin continua logado como admin — apenas mudamos a UI para "espiar"
 * o painel de um revendedor/cliente em modo somente leitura.
 */

export type ImpersonationTargetKind = "revendedor" | "cliente";

export type ImpersonationState = {
  kind: ImpersonationTargetKind;
  id: string;
  name: string;
  email: string;
  /** URL para retornar ao painel administrativo (com filtros/paginação). */
  returnTo: string;
  startedAt: number;
};

const KEY = "mr:impersonation:v1";
const EVENT = "mr:impersonation:changed";
const HTML_CLASS = "mr-impersonating";

function isBrowser() {
  return typeof window !== "undefined";
}

function syncHtmlFlag(state: ImpersonationState | null) {
  if (!isBrowser()) return;
  const html = document.documentElement;
  if (state) html.classList.add(HTML_CLASS);
  else html.classList.remove(HTML_CLASS);
}

export function getImpersonation(): ImpersonationState | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ImpersonationState;
    if (!parsed?.kind || !parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setImpersonation(
  state: Omit<ImpersonationState, "startedAt">,
  logContext?: { adminEmail?: string | null },
) {
  if (!isBrowser()) return;
  const full: ImpersonationState = { ...state, startedAt: Date.now() };
  window.sessionStorage.setItem(KEY, JSON.stringify(full));
  syncHtmlFlag(full);
  // Log INTERNO — apenas console. Sem escrever no banco.
  const admin = logContext?.adminEmail ?? "admin";
  const label = full.kind === "revendedor" ? "Revendedor" : "Cliente";
  // eslint-disable-next-line no-console
  console.info(
    `[impersonation] ${admin} visualizou painel do ${label} ${full.name || full.id} (${full.email || "sem email"})`,
  );
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function clearImpersonation() {
  if (!isBrowser()) return;
  window.sessionStorage.removeItem(KEY);
  syncHtmlFlag(null);
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function subscribeImpersonation(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

// Sincroniza a flag no <html> ao carregar (após F5 mantendo sessionStorage).
if (isBrowser()) {
  syncHtmlFlag(getImpersonation());
}
