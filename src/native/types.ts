/**
 * Tipos compartilhados por toda a camada NativeService.
 *
 * TODA função nativa retorna `NativeResult<T>` — nunca `throw`.
 * O consumidor decide o que fazer com `ok:false` sem try/catch.
 */

export type Platform = "android" | "ios" | "web";

export type NativeErrorCode =
  | "unsupported" // recurso não existe nesta plataforma
  | "not_implemented" // ainda não implementado (fase futura)
  | "permission_denied"
  | "cancelled"
  | "not_available" // plugin não instalado ou API bloqueada
  | "unknown";

export interface NativeError {
  code: NativeErrorCode;
  message: string;
  cause?: unknown;
}

export type NativeResult<T = void> = { ok: true; data: T } | { ok: false; error: NativeError };

export const ok = <T>(data: T): NativeResult<T> => ({ ok: true, data });

export const fail = (
  code: NativeErrorCode,
  message: string,
  cause?: unknown,
): NativeResult<never> => ({ ok: false, error: { code, message, cause } });

/** Wrapper para converter throws de plugins em `NativeResult`. */
export async function safeCall<T>(label: string, fn: () => Promise<T>): Promise<NativeResult<T>> {
  try {
    return ok(await fn());
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return fail("unknown", `[${label}] ${message}`, cause);
  }
}

/** Marca métodos ainda não implementados nesta fase. */
export const notImplemented = (label: string): NativeResult<never> =>
  fail("not_implemented", `${label} será implementado em fase futura.`);

/** Marca métodos indisponíveis na plataforma atual. */
export const unsupported = (label: string, platform: Platform): NativeResult<never> =>
  fail("unsupported", `${label} não é suportado em ${platform}.`);
