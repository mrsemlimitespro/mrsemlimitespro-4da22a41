/**
 * DeepLinksService — recebimento de URLs (Universal Links iOS,
 * App Links Android) que abriram o app.
 *
 * Fase atual: contrato. A implementação usará App.addListener('appUrlOpen', ...)
 * do @capacitor/app e roteará via TanStack Router.
 */
type Unsubscribe = () => void;

export interface DeepLinkPayload {
  /** URL completa recebida. */
  url: string;
  /** Path relativo (após origin), pronto para navigate({ to }). */
  path: string;
}

export const DeepLinksService = {
  onOpen(_cb: (payload: DeepLinkPayload) => void): Unsubscribe {
    // Registrar App.addListener('appUrlOpen') aqui na fase de implementação.
    return () => {};
  },
};
