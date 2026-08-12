import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Configuração Capacitor — MR Sem Limites
 *
 * Estratégia: o app nativo carrega a versão publicada no Cloudflare
 * (SSR + Server Functions + Realtime), aproveitando 100% da arquitetura web.
 * Isso mantém uma única base de código e um único deploy backend.
 *
 * Para builds de produção você pode:
 *   - Manter `server.url` apontando para o domínio publicado (mais simples)
 *   - OU comentar `server.url` e servir um bundle offline empacotado em `webDir`
 */
const config: CapacitorConfig = {
  appId: "app.lovable.mrsemlimites",
  appName: "MR Sem Limites",
  webDir: "www",
  bundledWebRuntime: false,

  server: {
    // App nativo aponta para o site publicado (SSR + Server Functions + Realtime).
    // Comente esta linha para builds 100% offline com bundle empacotado.
    url: "https://mrsemlimites.lovable.app",
    cleartext: false,
    androidScheme: "https",
    iosScheme: "https",
  },

  ios: {
    contentInset: "always",
    limitsNavigationsToAppBoundDomains: false,
    backgroundColor: "#0a0a0f",
  },

  android: {
    backgroundColor: "#0a0a0f",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#0a0a0f",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0a0a0f",
      overlaysWebView: false,
    },
  },
};

export default config;
